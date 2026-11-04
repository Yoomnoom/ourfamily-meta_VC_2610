-- 방문 집계 3차: 영상 재생·시청 시간 기록 + 더 많은 수치(주간 비교, 주별·요일별, 작품별 시청, 들어온 곳·나간 곳, 단계별 이동 등).
-- 재실행해도 안전하게 작성했다. (ourfamilymeta_ 접두사 표·함수만 건드린다. 1차·2차 SQL 을 먼저 실행해야 한다)
-- 개인정보는 저장하지 않는다: 새로 늘어나는 것은 영상 재생 이벤트(재생·끝까지 봄·본 시간)뿐이다.

-- 1) 이벤트 종류 확장: view(열기) leave(떠남) play(재생 시작) progress(25·50·75% 지점) end(끝까지) watch(실제 본 시간)
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.ourfamilymeta_pageviews'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%event%'
  loop
    execute format('alter table public.ourfamilymeta_pageviews drop constraint %I', c);
  end loop;
end $$;
alter table public.ourfamilymeta_pageviews
  add constraint ourfamilymeta_pageviews_event_ck check (event in ('view', 'leave', 'play', 'progress', 'end', 'watch'));
alter table public.ourfamilymeta_pageviews
  add column if not exists pct smallint check (pct is null or pct between 0 and 100);
create index if not exists ourfamilymeta_pageviews_event_idx on public.ourfamilymeta_pageviews (event, created_at);

-- 2) 보고서 함수 (편집자만). 2차 함수의 모든 항목을 그대로 포함하고 새 항목을 더한다.
create or replace function public.ourfamilymeta_pageview_report_v3()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb; today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.ourfamilymeta_is_editor() then
    raise exception '편집자만 볼 수 있어요.' using errcode = '42501';
  end if;
  with v as (   -- 방문(열기) 기록. 작품 주소 뒤에 잘못 붙은 "?..." 는 잘라 같은 작품으로 묶는다
    select id, created_at, page, nullif(split_part(coalesce(work, ''), '?', 1), '') as work, visitor, pv, session, entry,
           device, browser, os, lang, screen, country, city, referrer,
           coalesce(session, pv, id::text) as sid, (created_at at time zone 'Asia/Seoul')::date as d,
           date_trunc('week', created_at at time zone 'Asia/Seoul')::date as wk
    from public.ourfamilymeta_pageviews where event = 'view'
  ),
  stay as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'leave' and pv is not null and seconds between 1 and 3600 group by pv),
  watched as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'watch' and pv is not null and seconds between 1 and 14400 group by pv),
  ev as (       -- 영상 이벤트(방문 pv 기준으로 한 번씩만)
    select distinct pv, event, coalesce(pct, 0) as pct, nullif(split_part(coalesce(work, ''), '?', 1), '') as work, session
    from public.ourfamilymeta_pageviews where event in ('play', 'progress', 'end') and pv is not null
  ),
  vf as (select visitor, min(d) as first_d, count(*) as n, count(distinct d) as days from v group by visitor),
  vv as (select v.*, vf.first_d, (v.d = vf.first_d) as is_new from v join vf using (visitor)),
  ses as (select sid, count(*) as pages, sum(coalesce(stay.s, 0)) as secs, min(created_at) as t0
          from v left join stay on stay.pv = v.pv group by sid),
  entry_pg as (select distinct on (sid) sid, page, work from v order by sid, created_at, id),
  exit_pg as (select distinct on (sid) sid, page, work from v order by sid, created_at desc, id desc),
  ses_pages as (select sid, array_agg(distinct page) as pages from v group by sid),
  ses_ev as (select session as sid, bool_or(event = 'play') as played, bool_or(event = 'end') as ended from ev where session is not null group by session),
  cur as (select * from vv where d >= today - 6),
  prev as (select * from vv where d between today - 13 and today - 7)
  select jsonb_build_object(
    'v3', true,
    'total', jsonb_build_object(
      'views', (select count(*) from v),
      'visitors', (select count(*) from vf),
      'sessions', (select count(*) from ses),
      'returning', (select count(*) from vf where days >= 2),
      'today', (select count(*) from v where d = today),
      'today_visitors', (select count(distinct visitor) from v where d = today),
      'week', (select count(*) from v where created_at >= now() - interval '7 days'),
      'month', (select count(*) from v where created_at >= now() - interval '30 days'),
      'avg_page_secs', (select round(avg(s)) from stay),
      'avg_session_secs', (select round(avg(secs)) from ses where secs > 0),
      'avg_pages', (select round(avg(pages), 1) from ses),
      'bounce', (select count(*) from ses where pages = 1),
      'new_views', (select count(*) from vv where is_new),
      'first_record', (select min(created_at) from public.ourfamilymeta_pageviews),
      'last_record', (select max(created_at) from public.ourfamilymeta_pageviews),
      'rows', (select count(*) from public.ourfamilymeta_pageviews),
      'no_device', (select count(*) from v where device is null),
      'no_leave', (select count(*) from v where not exists (select 1 from stay where stay.pv = v.pv)),
      'plays', (select count(*) from ev where event = 'play'),
      'ends', (select count(*) from ev where event = 'end'),
      'watch_secs', (select coalesce(sum(s), 0) from watched),
      'avg_watch_secs', (select round(avg(s)) from watched)),
    'compare', jsonb_build_object(
      'cur', jsonb_build_object('views', (select count(*) from cur), 'visitors', (select count(distinct visitor) from cur),
        'new_visitors', (select count(distinct visitor) from cur where is_new),
        'sessions', (select count(distinct sid) from cur),
        'avg_page_secs', (select round(avg(stay.s)) from cur join stay using (pv)),
        'plays', (select count(*) from ev join cur using (pv) where ev.event = 'play'),
        'from', today - 6, 'to', today),
      'prev', jsonb_build_object('views', (select count(*) from prev), 'visitors', (select count(distinct visitor) from prev),
        'new_visitors', (select count(distinct visitor) from prev where is_new),
        'sessions', (select count(distinct sid) from prev),
        'avg_page_secs', (select round(avg(stay.s)) from prev join stay using (pv)),
        'plays', (select count(*) from ev join prev using (pv) where ev.event = 'play'),
        'from', today - 13, 'to', today - 7))
  ) || jsonb_build_object(
    'by_day', (select coalesce(jsonb_agg(x order by x.d), '[]') from (
        select g::date as d, (select count(*) from v where v.d = g::date) as views, (select count(distinct visitor) from v where v.d = g::date) as visitors,
               (select count(*) from vf where vf.first_d = g::date) as new_visitors
        from generate_series(today - 29, today, interval '1 day') g) x),
    'by_week', (select coalesce(jsonb_agg(x order by x.wk), '[]') from (
        select g::date as wk, (select count(*) from v where v.wk = g::date) as views, (select count(distinct visitor) from v where v.wk = g::date) as visitors,
               (select count(*) from vf where date_trunc('week', vf.first_d)::date = g::date) as new_visitors,
               (select count(distinct sid) from v where v.wk = g::date) as sessions,
               (select round(avg(stay.s)) from v join stay using (pv) where v.wk = g::date) as avg_secs,
               (select count(*) from ev join v using (pv) where ev.event = 'play' and v.wk = g::date) as plays
        from generate_series(date_trunc('week', today::timestamp) - interval '11 weeks', date_trunc('week', today::timestamp), interval '1 week') g) x),
    'by_dow', (select coalesce(jsonb_agg(x order by x.k), '[]') from (
        select extract(isodow from created_at at time zone 'Asia/Seoul')::int as k, count(*) as n, count(distinct visitor) as visitors from v group by 1) x),
    'by_hour', (select coalesce(jsonb_agg(x order by x.k), '[]') from (select extract(hour from created_at at time zone 'Asia/Seoul')::int as k, count(*) as n from v group by 1) x),
    'heat', (select coalesce(jsonb_agg(x), '[]') from (
        select extract(isodow from created_at at time zone 'Asia/Seoul')::int as dow, extract(hour from created_at at time zone 'Asia/Seoul')::int as h, count(*) as n from v group by 1, 2) x)
  ) || jsonb_build_object(
    'by_page', (select coalesce(jsonb_agg(x order by x.views desc), '[]') from (
        select v.page, v.work, count(*) as views, count(distinct v.visitor) as visitors, round(avg(stay.s)) as avg_secs,
               count(*) filter (where s2.pages = 1) as bounces,
               count(*) filter (where v.entry) as entries
        from v left join stay on stay.pv = v.pv left join ses s2 on s2.sid = v.sid
        group by v.page, v.work) x),
    'entry_pages', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select page, work, count(*) as n from entry_pg group by page, work order by n desc limit 15) x),
    'exit_pages', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select page, work, count(*) as n from exit_pg group by page, work order by n desc limit 15) x),
    'by_work', (select coalesce(jsonb_agg(x order by x.views desc), '[]') from (
        select v.work, count(*) as views, count(distinct v.visitor) as visitors, round(avg(stay.s)) as avg_stay,
               count(*) filter (where exists (select 1 from ev where ev.pv = v.pv and ev.event = 'play')) as plays,
               count(*) filter (where exists (select 1 from ev where ev.pv = v.pv and ev.event = 'progress' and ev.pct = 25)) as p25,
               count(*) filter (where exists (select 1 from ev where ev.pv = v.pv and ev.event = 'progress' and ev.pct = 50)) as p50,
               count(*) filter (where exists (select 1 from ev where ev.pv = v.pv and ev.event = 'progress' and ev.pct = 75)) as p75,
               count(*) filter (where exists (select 1 from ev where ev.pv = v.pv and ev.event = 'end')) as ends,
               round(avg(w.s)) as avg_watch, coalesce(sum(w.s), 0) as total_watch
        from v left join stay on stay.pv = v.pv left join watched w on w.pv = v.pv
        where v.page = 'watch' and v.work is not null group by v.work) x),
    'depth', (select coalesce(jsonb_agg(x order by x.k), '[]') from (select least(pages, 5) as k, count(*) as n from ses group by 1) x),
    'dur', (select coalesce(jsonb_agg(x order by x.k), '[]') from (
        select case when secs = 0 then 0 when secs < 10 then 1 when secs < 30 then 2 when secs < 60 then 3 when secs < 180 then 4 when secs < 600 then 5 else 6 end as k, count(*) as n
        from ses group by 1) x),
    'funnel', jsonb_build_object(
      'sessions', (select count(*) from ses),
      'home', (select count(*) from ses_pages where 'index' = any(pages)),
      'works', (select count(*) from ses_pages where 'works' = any(pages)),
      'watch', (select count(*) from ses_pages where 'watch' = any(pages)),
      'played', (select count(*) from ses_ev where played),
      'ended', (select count(*) from ses_ev where ended))
  ) || jsonb_build_object(
    'by_screen', (select coalesce(jsonb_agg(x order by x.k), '[]') from (
        select case when w < 480 then 1 when w < 768 then 2 when w < 1280 then 3 when w < 1920 then 4 else 5 end as k, count(*) as n
        from (select split_part(screen, 'x', 1)::int as w from v where screen ~ '^\d+x\d+$') s group by 1) x),
    'by_device', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(device, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_browser', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(browser, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_os', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(os, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_lang', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(lang, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_country', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(country, '') as k, count(*) as n from v group by 1) x),
    'by_city', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(city, '') as k, coalesce(country, '') as c, count(*) as n from v where city is not null group by 1, 2 order by 3 desc limit 15) x),
    'by_referrer', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(nullif(referrer, ''), '') as k, count(*) as n from v where entry group by 1 order by 2 desc limit 15) x),
    'visit_freq', (select coalesce(jsonb_agg(x order by x.k), '[]') from (select least(days, 4) as k, count(*) as n from vf group by 1) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_pageview_report_v3() from public, anon;
grant execute on function public.ourfamilymeta_pageview_report_v3() to authenticated;
