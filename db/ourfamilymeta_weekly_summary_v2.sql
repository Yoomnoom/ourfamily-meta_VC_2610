-- 주간·일간 자동 보고 2차: 보고서에 페이지별 표, 방문 흐름, 방문자 특성, 날짜별 막대를 넣기 위한 추가 항목.
-- 기존 ourfamilymeta_weekly_summary 와 같은 이름·같은 인자로 다시 만들며, 기존 항목은 그대로 두고 새 항목만 더한다.
-- 재실행해도 안전하다. Supabase SQL Editor 에서 한 번 실행한다. (weekly_summary.sql, pageviews_v2·v3 이후)
create or replace function public.ourfamilymeta_weekly_summary(p_secret text, p_week date default null, p_end date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare w0 date; w1 date; r jsonb;
begin
  if p_secret is null or p_secret <> (select secret from public.ourfamilymeta_cron_secret where id = 1) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  w0 := coalesce(p_week, date_trunc('week', (now() at time zone 'Asia/Seoul'))::date - 7);
  w1 := coalesce(p_end, w0 + 6);
  with v as (
    select id, page, nullif(split_part(coalesce(work, ''), '?', 1), '') as work, visitor, pv, coalesce(session, pv, id::text) as sid,
           device, browser, os, referrer, country, city, entry, (created_at at time zone 'Asia/Seoul')::date as d
    from public.ourfamilymeta_pageviews where event = 'view'
  ),
  firsts as (select visitor, min(d) as first_d from v group by visitor),
  stay as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'leave' and pv is not null and seconds between 1 and 3600 group by pv),
  watched as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'watch' and pv is not null and seconds between 1 and 14400 group by pv),
  evp as (select distinct pv, event from public.ourfamilymeta_pageviews where event in ('play', 'end') and pv is not null),
  cur as (select v.* from v where d between w0 and w1),
  prev as (select v.* from v where d between w0 - (w1 - w0 + 1) and w0 - 1),
  ses as (select sid, count(*) as pages from cur group by sid)
  select jsonb_build_object(
    'week_start', w0, 'week_end', w1,
    'views', (select count(*) from cur),
    'visitors', (select count(distinct visitor) from cur),
    'new_visitors', (select count(distinct c.visitor) from cur c join firsts f using (visitor) where f.first_d between w0 and w1),
    'returning_visitors', (select count(distinct c.visitor) from cur c join firsts f using (visitor) where f.first_d < w0),
    'sessions', (select count(*) from ses),
    'bounce_sessions', (select count(*) from ses where pages = 1),
    'avg_pages', (select round(avg(pages), 1) from ses),
    'avg_page_secs', (select round(avg(stay.s)) from cur join stay using (pv)),
    'plays', (select count(*) from evp join cur using (pv) where evp.event = 'play'),
    'ends', (select count(*) from evp join cur using (pv) where evp.event = 'end'),
    'avg_watch_secs', (select round(avg(watched.s)) from cur join watched using (pv)),
    'prev_views', (select count(*) from prev),
    'prev_visitors', (select count(distinct visitor) from prev),
    'top_pages', (select coalesce(jsonb_agg(x), '[]') from (select page, work, count(*) as views from cur group by page, work order by views desc limit 5) x),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(device, '알 수 없음') as k, count(*) as n from cur group by 1 order by n desc) x),
    'countries', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(country, '') as k, count(*) as n from cur group by 1 order by n desc limit 5) x),
    -- ↓ 2차에서 더한 항목
    'pages', (select coalesce(jsonb_agg(x), '[]') from (
        select c.page, c.work, count(*) as views, count(distinct c.visitor) as visitors, round(avg(stay.s)) as avg_secs
        from cur c left join stay using (pv) group by c.page, c.work order by views desc limit 15) x),
    'funnel', jsonb_build_object(
        'sessions', (select count(*) from ses),
        'home', (select count(distinct sid) from cur where page = 'index'),
        'works', (select count(distinct sid) from cur where page = 'works'),
        'watch', (select count(distinct sid) from cur where page = 'watch'),
        'play', (select count(distinct c.sid) from cur c join evp e using (pv) where e.event = 'play')),
    'depth', (select coalesce(jsonb_agg(x order by x.k), '[]') from (select least(pages, 5) as k, count(*) as n from ses group by 1) x),
    'entry_pages', (select coalesce(jsonb_agg(x), '[]') from (select page, work, count(*) as n from cur where entry group by page, work order by n desc limit 4) x),
    'browsers', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(browser, '알 수 없음') as k, count(*) as n from cur group by 1 order by n desc limit 4) x),
    'oses', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(os, '알 수 없음') as k, count(*) as n from cur group by 1 order by n desc limit 4) x),
    'referrers', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(nullif(referrer, ''), '직접·북마크·앱') as k, count(*) as n from cur group by 1 order by n desc limit 4) x),
    'cities', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(nullif(city, ''), '알 수 없음') as k, count(*) as n from cur group by 1 order by n desc limit 3) x),
    -- 자동 접속(봇·점검 도구) 의심: 해외 접속이거나 Linux 컴퓨터. 본 페이지 수와 머문 시간을 함께 보여 사람인지 가려 보게 한다.
    'suspects', (select coalesce(jsonb_agg(x order by x.t), '[]') from (
        select to_char(c.at_kst, 'MM/DD HH24:MI') as t, c.page, c.work, coalesce(c.city, '') as city, coalesce(c.country, '') as country,
               coalesce(c.os, '') as os, coalesce(c.browser, '') as browser, stay.s as secs, (select count(*) from cur z where z.sid = c.sid) as pages
        from (select cur.*, (select created_at at time zone 'Asia/Seoul' from public.ourfamilymeta_pageviews p where p.id = cur.id) as at_kst from cur) c
        left join stay using (pv)
        where (c.country is not null and c.country <> '' and c.country <> 'KR') or c.os = 'Linux'
        order by c.at_kst limit 10) x),
    'suspect_views', (select count(*) from cur where (country is not null and country <> '' and country <> 'KR') or os = 'Linux'),
    'daily', (select coalesce(jsonb_agg(x order by x.d), '[]') from (select d, count(*) as views, count(distinct visitor) as visitors from cur group by d) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_weekly_summary(text, date, date) from public;
grant execute on function public.ourfamilymeta_weekly_summary(text, date, date) to anon, authenticated;
