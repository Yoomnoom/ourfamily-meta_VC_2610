-- 주간 자동 보고용: 비밀 문구를 아는 쪽(Vercel 자동 실행)만 지난 한 주 요약을 받는다.
-- 재실행해도 안전하다. (ourfamilymeta_ 접두사 표·함수만 건드린다. 2차·3차 SQL 을 먼저 실행해야 한다)

-- 1) 비밀 문구 표: 무작위 문구가 한 번 만들어진다. 읽기·수정 정책이 없어 웹에서는 열 수 없다.
create table if not exists public.ourfamilymeta_cron_secret (
  id int primary key default 1 check (id = 1),
  secret text not null default encode(gen_random_bytes(18), 'hex')
);
alter table public.ourfamilymeta_cron_secret enable row level security;
insert into public.ourfamilymeta_cron_secret (id) values (1) on conflict do nothing;

-- 2) 요약 함수: 인자로 비밀 문구와 주 시작일(월요일). 주 시작일을 비우면 "지난 월~일"을 쓴다 (한국 시간).
create or replace function public.ourfamilymeta_weekly_summary(p_secret text, p_week date default null)
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
  w1 := w0 + 6;
  with v as (
    select id, page, nullif(split_part(coalesce(work, ''), '?', 1), '') as work, visitor, pv, coalesce(session, pv, id::text) as sid,
           device, country, (created_at at time zone 'Asia/Seoul')::date as d
    from public.ourfamilymeta_pageviews where event = 'view'
  ),
  firsts as (select visitor, min(d) as first_d from v group by visitor),
  stay as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'leave' and pv is not null and seconds between 1 and 3600 group by pv),
  watched as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'watch' and pv is not null and seconds between 1 and 14400 group by pv),
  evp as (select distinct pv, event from public.ourfamilymeta_pageviews where event in ('play', 'end') and pv is not null),
  cur as (select v.* from v where d between w0 and w1),
  prev as (select v.* from v where d between w0 - 7 and w0 - 1),
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
    'countries', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(country, '') as k, count(*) as n from cur group by 1 order by n desc limit 5) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_weekly_summary(text, date) from public;
grant execute on function public.ourfamilymeta_weekly_summary(text, date) to anon, authenticated;
