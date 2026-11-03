-- 방문 집계: 공개 페이지가 방문 1건씩 기록하고, 편집자만 CMS에서 합계를 본다.
-- 재실행해도 안전하게 작성했다. (ourfamilymeta_ 접두사 테이블·함수·정책만 건드린다)
-- 개인정보는 저장하지 않는다: 페이지 이름, 작품 주소(ID), 브라우저가 만든 임의 방문자 번호, 시각뿐이다.

-- 1) 방문 기록 표
create table if not exists public.ourfamilymeta_pageviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page text not null check (char_length(page) between 1 and 80),
  work text check (work is null or char_length(work) <= 80),
  visitor text not null check (char_length(visitor) between 8 and 40)
);
create index if not exists ourfamilymeta_pageviews_page_idx
  on public.ourfamilymeta_pageviews (page, work, created_at);

-- 2) 권한: 누구나 기록(insert)만 가능, 읽기·수정·삭제 정책은 만들지 않는다 (아래 함수로만 합계를 본다)
alter table public.ourfamilymeta_pageviews enable row level security;
drop policy if exists ourfamilymeta_pageviews_insert on public.ourfamilymeta_pageviews;
create policy ourfamilymeta_pageviews_insert on public.ourfamilymeta_pageviews
  for insert to anon, authenticated with check (true);

-- 3) 합계 함수: 편집자만 실행. 마지막 줄(page 와 work 가 모두 비어 있는 행)이 전체 합계다.
create or replace function public.ourfamilymeta_pageview_stats()
returns table(page text, work text, views bigint, visitors bigint, today bigint, week bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ourfamilymeta_is_editor() then
    raise exception '편집자만 볼 수 있어요.' using errcode = '42501';
  end if;
  return query
    select p.page, p.work, count(*), count(distinct p.visitor),
           count(*) filter (where p.created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
           count(*) filter (where p.created_at >= now() - interval '7 days')
    from public.ourfamilymeta_pageviews p
    group by grouping sets ((p.page, p.work), ())
    order by (p.page is null), count(*) desc;
end;
$$;
revoke all on function public.ourfamilymeta_pageview_stats() from public, anon;
grant execute on function public.ourfamilymeta_pageview_stats() to authenticated;
