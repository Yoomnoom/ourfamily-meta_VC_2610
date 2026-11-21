-- 방문 집계: 최근 N시간(1·12·24시간) 보기. 직전 같은 길이 구간과 비교 수치도 함께 준다. 재실행해도 안전. 편집자만 호출. (3차 SQL 먼저)
create or replace function public.ourfamilymeta_pageview_recent(p_hours int, p_bucket_min int default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  t1 timestamptz := now();
  t0 timestamptz := now() - make_interval(hours => greatest(1, least(p_hours, 168)));
  tp timestamptz := now() - make_interval(hours => greatest(1, least(p_hours, 168)) * 2);
  b int := greatest(1, least(p_bucket_min, 1440));
begin
  if not public.ourfamilymeta_is_editor() then
    raise exception '편집자만 볼 수 있어요.' using errcode = '42501';
  end if;
  with v as (
    select created_at, visitor, pv, coalesce(session, pv, id::text) as sid
    from public.ourfamilymeta_pageviews where event = 'view' and created_at >= tp
  ),
  first_v as (select visitor, min(created_at) as t from public.ourfamilymeta_pageviews where event = 'view' group by visitor),
  stay as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'leave' and pv is not null and seconds between 1 and 3600 and created_at >= tp group by pv),
  ev as (select distinct pv from public.ourfamilymeta_pageviews where event = 'play' and pv is not null and created_at >= tp),
  cur as (select *, to_timestamp(floor(extract(epoch from created_at) / (b * 60)) * b * 60) as bk from v where created_at >= t0),
  prv as (select * from v where created_at < t0)
  select jsonb_build_object(
    'from', t0, 'to', t1, 'bucket_min', b,
    'total', jsonb_build_object(
      'views', (select count(*) from cur), 'visitors', (select count(distinct visitor) from cur),
      'new_visitors', (select count(*) from first_v where t >= t0),
      'sessions', (select count(distinct sid) from cur),
      'avg_secs', (select round(avg(stay.s)) from cur join stay using (pv)),
      'plays', (select count(*) from ev join cur using (pv))),
    'prev', jsonb_build_object(
      'views', (select count(*) from prv), 'visitors', (select count(distinct visitor) from prv),
      'new_visitors', (select count(*) from first_v where t >= tp and t < t0),
      'sessions', (select count(distinct sid) from prv),
      'avg_secs', (select round(avg(stay.s)) from prv join stay using (pv)),
      'plays', (select count(*) from ev join prv using (pv))),
    'rows', (select coalesce(jsonb_agg(x order by x.bk), '[]') from (
      select g as bk,
             (select count(*) from cur where cur.bk = g) as views,
             (select count(distinct visitor) from cur where cur.bk = g) as visitors,
             (select count(*) from first_v where to_timestamp(floor(extract(epoch from t) / (b * 60)) * b * 60) = g and t >= t0) as new_visitors,
             (select count(distinct sid) from cur where cur.bk = g) as sessions,
             (select round(avg(stay.s)) from cur join stay using (pv) where cur.bk = g) as avg_secs,
             (select count(*) from ev join cur using (pv) where cur.bk = g) as plays
      from generate_series(to_timestamp(floor(extract(epoch from t0) / (b * 60)) * b * 60), t1, make_interval(mins => b)) g) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_pageview_recent(int, int) from public, anon;
grant execute on function public.ourfamilymeta_pageview_recent(int, int) to authenticated;
