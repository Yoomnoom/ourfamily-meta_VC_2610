-- 관리자가 만든 작품·연재물: 편집자 누구나 수정 가능. 관리자가 "잠금"하면 지정한 사람만 수정 가능.
-- 재실행해도 안전하다. (ourfamilymeta_ 접두사 테이블·정책·함수만 건드린다)
--
-- locked_to : null = 잠금 없음(관리자가 만든 것이면 편집자 누구나 수정)
--             '{}' = 잠금, 지정한 사람 없음(관리자만)
--             '{a@x.com,b@y.com}' = 잠금, 지정한 사람만(소문자 이메일)
-- owner_admin : 담당자(owner)가 관리자인가. 트리거가 자동으로 채운다.
-- 관리자가 만든 것이 아니면 예전과 같다: 담당자와 관리자만 수정.
-- 삭제는 예전과 같다: 담당자와 관리자만.

-- 1) 컬럼
alter table public.ourfamilymeta_works  add column if not exists owner_admin boolean not null default false, add column if not exists locked_to text[];
alter table public.ourfamilymeta_series add column if not exists owner_admin boolean not null default false, add column if not exists locked_to text[];

-- 2) 수정 가능 여부 함수
create or replace function public.ourfamilymeta_can_edit(o text, o_admin boolean, lk text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ourfamilymeta_is_admin() or (public.ourfamilymeta_is_editor() and (
    o = lower(auth.jwt() ->> 'email')
    or (coalesce(o_admin, false) and (lk is null or lower(auth.jwt() ->> 'email') = any(lk)))));
$$;

-- 3) owner_admin 자동 기록 + 잠금 변경은 관리자만 (SQL 편집기처럼 로그인 정보가 없는 실행은 제한하지 않는다)
create or replace function public.ourfamilymeta_guard_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  new.owner_admin := exists (select 1 from public.ourfamilymeta_editors e where e.email = lower(coalesce(new.owner, '')) and e.role = 'admin');
  if me <> '' and not public.ourfamilymeta_is_admin() then
    if tg_op = 'INSERT' then
      new.locked_to := null;
    elsif new.locked_to is distinct from old.locked_to then
      raise exception '잠금은 관리자만 바꿀 수 있어요.' using errcode = '42501';
    end if;
  end if;
  if new.locked_to is not null then
    new.locked_to := array(select distinct lower(trim(x)) from unnest(new.locked_to) x where trim(x) <> '');
  end if;
  return new;
end;
$$;

drop trigger if exists ourfamilymeta_works_zguard on public.ourfamilymeta_works;
create trigger ourfamilymeta_works_zguard before insert or update on public.ourfamilymeta_works
  for each row execute function public.ourfamilymeta_guard_lock();
drop trigger if exists ourfamilymeta_series_zguard on public.ourfamilymeta_series;
create trigger ourfamilymeta_series_zguard before insert or update on public.ourfamilymeta_series
  for each row execute function public.ourfamilymeta_guard_lock();

-- 4) 기존 행 채우기
update public.ourfamilymeta_works  w set owner_admin = exists (select 1 from public.ourfamilymeta_editors e where e.email = lower(coalesce(w.owner, '')) and e.role = 'admin');
update public.ourfamilymeta_series s set owner_admin = exists (select 1 from public.ourfamilymeta_editors e where e.email = lower(coalesce(s.owner, '')) and e.role = 'admin');

-- 5) 정책: 수정(작품·연재물)과 작품 추가 때 연재물 확인을 can_edit 으로
drop policy if exists ourfamilymeta_works_insert on public.ourfamilymeta_works;
drop policy if exists ourfamilymeta_works_update on public.ourfamilymeta_works;
create policy ourfamilymeta_works_insert on public.ourfamilymeta_works for insert to authenticated
  with check ((select public.ourfamilymeta_is_editor()) and ((select public.ourfamilymeta_is_admin()) or series_id is null
    or exists (select 1 from public.ourfamilymeta_series s where s.id = series_id and public.ourfamilymeta_can_edit(s.owner, s.owner_admin, s.locked_to))));
create policy ourfamilymeta_works_update on public.ourfamilymeta_works for update to authenticated
  using (public.ourfamilymeta_can_edit(owner, owner_admin, locked_to))
  with check (public.ourfamilymeta_can_edit(owner, owner_admin, locked_to) and ((select public.ourfamilymeta_is_admin()) or series_id is null
    or exists (select 1 from public.ourfamilymeta_series s where s.id = series_id and public.ourfamilymeta_can_edit(s.owner, s.owner_admin, s.locked_to))));

drop policy if exists ourfamilymeta_series_update on public.ourfamilymeta_series;
create policy ourfamilymeta_series_update on public.ourfamilymeta_series for update to authenticated
  using (public.ourfamilymeta_can_edit(owner, owner_admin, locked_to))
  with check (public.ourfamilymeta_can_edit(owner, owner_admin, locked_to));
