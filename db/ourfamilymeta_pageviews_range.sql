-- 방문 집계 기간별 보기: 시작일·끝일(한국 날짜)과 단위(day 일별 / week 주별 / month 월별)를 받아 표를 만든다.
-- 재실행해도 안전하다. 편집자만 호출할 수 있다. (3차 SQL 을 먼저 실행해야 한다)
create or replace function public.ourfamilymeta_pageview_range(p_from date, p_to date, p_unit text default 'day')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  u text := case when p_unit in ('week', 'month') then p_unit else 'day' end;
begin
  if not public.ourfamilymeta_is_editor() then
    raise exception '편집자만 볼 수 있어요.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception '기간이 올바르지 않아요.';
  end if;
  if p_to - p_from > 730 then
    raise exception '기간은 최대 2년까지 볼 수 있어요.';
  end if;
  with v as (
    select created_at, visitor, pv, coalesce(session, pv, id::text) as sid, (created_at at time zone 'Asia/Seoul')::date as d
    from public.ourfamilymeta_pageviews where event = 'view'
  ),
  stay as (select pv, max(seconds) as s from public.ourfamilymeta_pageviews where event = 'leave' and pv is not null and seconds between 1 and 3600 group by pv),
  ev as (select distinct pv from public.ourfamilymeta_pageviews where event = 'play' and pv is not null),
  vf as (select visitor, min(d) as first_d from v group by visitor),
  vr as (select v.*, date_trunc(u, v.d::timestamp)::date as b from v where v.d between p_from and p_to)
  select jsonb_build_object(
    'unit', u, 'from', p_from, 'to', p_to,
    'total', jsonb_build_object(
      'views', (select count(*) from vr),
      'visitors', (select count(distinct visitor) from vr),
      'new_visitors', (select count(*) from vf where first_d between p_from and p_to),
      'sessions', (select count(distinct sid) from vr),
      'avg_secs', (select round(avg(stay.s)) from vr join stay using (pv)),
      'plays', (select count(*) from ev join vr using (pv))),
    'rows', (select coalesce(jsonb_agg(x order by x.b), '[]') from (
      select g::date as b,
             (select count(*) from vr where vr.b = g::date) as views,
             (select count(distinct visitor) from vr where vr.b = g::date) as visitors,
             (select count(*) from vf where date_trunc(u, vf.first_d::timestamp)::date = g::date and vf.first_d between p_from and p_to) as new_visitors,
             (select count(distinct sid) from vr where vr.b = g::date) as sessions,
             (select round(avg(stay.s)) from vr join stay using (pv) where vr.b = g::date) as avg_secs,
             (select count(*) from ev join vr using (pv) where vr.b = g::date) as plays
      from generate_series(date_trunc(u, p_from::timestamp), date_trunc(u, p_to::timestamp), ('1 ' || u)::interval) g) x)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ourfamilymeta_pageview_range(date, date, text) from public, anon;
grant execute on function public.ourfamilymeta_pageview_range(date, date, text) to authenticated;
