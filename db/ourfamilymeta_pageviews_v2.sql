-- 방문 집계 2차: 체류 시간·재방문·기기·브라우저·지역·유입 경로까지 기록하고, 한 번에 보고서(jsonb)로 돌려준다.
-- 재실행해도 안전하게 작성했다. (ourfamilymeta_ 접두사 표·함수만 건드린다. 1차 db/ourfamilymeta_pageviews.sql 을 먼저 실행해야 한다)
-- 개인정보는 저장하지 않는다: IP·이름·정확한 위치는 없고, 나라·도시 수준 지역과 기기 종류만 기록한다.

-- 1) 칸 추가 (모두 길이 제한을 둔다)
alter table public.ourfamilymeta_pageviews
  add column if not exists event text not null default 'view' check (event in ('view', 'leave')),
  add column if not exists pv text check (pv is null or char_length(pv) <= 40),
  add column if not exists session text check (session is null or char_length(session) <= 40),
  add column if not exists entry boolean not null default false,
  add column if not exists seconds integer check (seconds is null or seconds between 0 and 86400),
  add column if not exists referrer text check (referrer is null or char_length(referrer) <= 100),
  add column if not exists device text check (device is null or char_length(device) <= 20),
  add column if not exists browser text check (browser is null or char_length(browser) <= 30),
  add column if not exists os text check (os is null or char_length(os) <= 30),
  add column if not exists lang text check (lang is null or char_length(lang) <= 20),
  add column if not exists tz text check (tz is null or char_length(tz) <= 40),
  add column if not exists screen text check (screen is null or char_length(screen) <= 20),
  add column if not exists country text check (country is null or char_length(country) <= 10),
  add column if not exists city text check (city is null or char_length(city) <= 60);
create index if not exists ourfamilymeta_pageviews_session_idx on public.ourfamilymeta_pageviews (session);
create index if not exists ourfamilymeta_pageviews_pv_idx on public.ourfamilymeta_pageviews (pv);

-- 2) 보고서 함수 (편집자만). 1차의 합계 함수는 이 함수로 대체한다.
drop function if exists public.ourfamilymeta_pageview_stats();
create or replace function public.ourfamilymeta_pageview_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if not public.ourfamilymeta_is_editor() then
    raise exception '편집자만 볼 수 있어요.' using errcode = '42501';
  end if;
  with v as (   -- 방문(열기) 기록, 한국 시간 날짜를 붙인다
    select *, (created_at at time zone 'Asia/Seoul')::date as d
    from public.ourfamilymeta_pageviews where event = 'view'
  ),
  stay as (     -- 페이지별 머문 시간: 같은 방문(pv)의 가장 긴 값 (1초~1시간만 인정)
    select pv, max(seconds) as s from public.ourfamilymeta_pageviews
    where event = 'leave' and pv is not null and seconds between 1 and 3600 group by pv
  ),
  vis as (      -- 방문자별: 몇 번, 며칠 왔나
    select visitor, count(*) as n, count(distinct d) as days from v group by visitor
  ),
  ses as (      -- 한 번의 방문(세션)별: 몇 페이지 봤나, 머문 시간 합
    select coalesce(v.session, v.pv, v.id::text) as sid, count(*) as pages, sum(coalesce(stay.s, 0)) as secs
    from v left join stay on stay.pv = v.pv group by 1
  )
  select jsonb_build_object(
    'total', jsonb_build_object(
      'views', (select count(*) from v),
      'visitors', (select count(*) from vis),
      'sessions', (select count(*) from ses),
      'returning', (select count(*) from vis where days >= 2),
      'today', (select count(*) from v where d = (now() at time zone 'Asia/Seoul')::date),
      'today_visitors', (select count(distinct visitor) from v where d = (now() at time zone 'Asia/Seoul')::date),
      'week', (select count(*) from v where created_at >= now() - interval '7 days'),
      'month', (select count(*) from v where created_at >= now() - interval '30 days'),
      'avg_page_secs', (select round(avg(s)) from stay),
      'avg_session_secs', (select round(avg(secs)) from ses where secs > 0),
      'avg_pages', (select round(avg(pages), 1) from ses),
      'bounce', (select count(*) from ses where pages = 1)),
    'by_day', (select coalesce(jsonb_agg(x order by x.d), '[]') from (
        select g::date as d, (select count(*) from v where v.d = g::date) as views, (select count(distinct visitor) from v where v.d = g::date) as visitors
        from generate_series((now() at time zone 'Asia/Seoul')::date - 13, (now() at time zone 'Asia/Seoul')::date, interval '1 day') g) x),
    'by_page', (select coalesce(jsonb_agg(x order by x.views desc), '[]') from (
        select v.page, v.work, count(*) as views, count(distinct v.visitor) as visitors, round(avg(stay.s)) as avg_secs
        from v left join stay on stay.pv = v.pv group by v.page, v.work) x),
    'by_hour', (select coalesce(jsonb_agg(x order by x.k), '[]') from (select extract(hour from created_at at time zone 'Asia/Seoul')::int as k, count(*) as n from v group by 1) x),
    'by_device', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(device, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_browser', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(browser, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_os', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(os, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_lang', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(lang, '알 수 없음') as k, count(*) as n from v group by 1) x),
    'by_country', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(country, '') as k, count(*) as n from v group by 1) x),
    'by_city', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(city, '') as k, coalesce(country, '') as c, count(*) as n from v where city is not null group by 1, 2 order by 3 desc limit 15) x),
    'by_referrer', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select coalesce(nullif(referrer, ''), '') as k, count(*) as n from v where entry group by 1 order by 2 desc limit 15) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_pageview_report() from public, anon;
grant execute on function public.ourfamilymeta_pageview_report() to authenticated;
