-- 1차: 연재물 공통 제작 정보 + 담당자(owner) 권한 + 단독 작품(solo) 연재물
-- 재실행해도 안전하게 작성했다. (ourfamilymeta_ 접두사 테이블·정책만 건드린다)

-- 1) 컬럼
alter table public.ourfamilymeta_series
  add column if not exists owner text,
  add column if not exists solo boolean not null default false,
  add column if not exists common jsonb not null default '{}'::jsonb;
alter table public.ourfamilymeta_works add column if not exists owner text;

-- 2) 담당자는 로그인한 사용자의 이메일로 DB가 직접 기록한다. 클라이언트가 보낸 값은 쓰지 않는다.
--    담당자 변경은 관리자만 가능. (SQL 편집기처럼 로그인 정보가 없는 실행은 제한하지 않는다)
create or replace function public.ourfamilymeta_set_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if me = '' then return new; end if;
  if tg_op = 'INSERT' then
    new.owner := me;
  elsif new.owner is distinct from old.owner and not public.ourfamilymeta_is_admin() then
    raise exception '담당자는 관리자만 바꿀 수 있어요.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists ourfamilymeta_works_owner on public.ourfamilymeta_works;
create trigger ourfamilymeta_works_owner before insert or update on public.ourfamilymeta_works
  for each row execute function public.ourfamilymeta_set_owner();
drop trigger if exists ourfamilymeta_series_owner on public.ourfamilymeta_series;
create trigger ourfamilymeta_series_owner before insert or update on public.ourfamilymeta_series
  for each row execute function public.ourfamilymeta_set_owner();

-- 3) 기존 행의 담당자는 최초 관리자로
update public.ourfamilymeta_series set owner = (select email from public.ourfamilymeta_editors where role = 'admin' order by created_at limit 1) where owner is null;
update public.ourfamilymeta_works set owner = (select email from public.ourfamilymeta_editors where role = 'admin' order by created_at limit 1) where owner is null;

-- 4) 연재물 없이 올린 기존 작품마다 solo 연재물을 만들어 연결 (공통 제작 정보는 작품 것을 복사)
do $$
declare w record; sid uuid;
begin
  for w in select id, title, owner, poster_path, content from public.ourfamilymeta_works where series_id is null loop
    insert into public.ourfamilymeta_series (title, poster_path, status, is_published, solo, owner, common)
    values (coalesce(nullif(w.title, ''), '(제목 없음)'), w.poster_path, 'ongoing', true, true, w.owner,
      jsonb_strip_nulls(jsonb_build_object('process', w.content -> 'process', 'tools', w.content -> 'tools', 'roles', w.content -> 'roles', 'sources', w.content -> 'sources')))
    returning id into sid;
    update public.ourfamilymeta_works set series_id = sid, episode_no = 1 where id = w.id;
  end loop;
end;
$$;

-- 5) 작품·연재물: 담당자와 관리자만 수정·삭제. 연재물을 새로 만드는 것은 편집자 누구나.
drop policy if exists ourfamilymeta_works_insert on public.ourfamilymeta_works;
drop policy if exists ourfamilymeta_works_update on public.ourfamilymeta_works;
drop policy if exists ourfamilymeta_works_delete on public.ourfamilymeta_works;
create policy ourfamilymeta_works_insert on public.ourfamilymeta_works for insert to authenticated
  with check ((select public.ourfamilymeta_is_editor()) and ((select public.ourfamilymeta_is_admin()) or series_id is null
    or exists (select 1 from public.ourfamilymeta_series s where s.id = series_id and s.owner = lower(auth.jwt() ->> 'email'))));
create policy ourfamilymeta_works_update on public.ourfamilymeta_works for update to authenticated
  using ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email')))
  with check ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email') and (series_id is null
    or exists (select 1 from public.ourfamilymeta_series s where s.id = series_id and s.owner = lower(auth.jwt() ->> 'email')))));
create policy ourfamilymeta_works_delete on public.ourfamilymeta_works for delete to authenticated
  using ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email')));

drop policy if exists ourfamilymeta_series_insert on public.ourfamilymeta_series;
drop policy if exists ourfamilymeta_series_update on public.ourfamilymeta_series;
drop policy if exists ourfamilymeta_series_delete on public.ourfamilymeta_series;
create policy ourfamilymeta_series_insert on public.ourfamilymeta_series for insert to authenticated
  with check ((select public.ourfamilymeta_is_editor()));
create policy ourfamilymeta_series_update on public.ourfamilymeta_series for update to authenticated
  using ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email')))
  with check ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email')));
create policy ourfamilymeta_series_delete on public.ourfamilymeta_series for delete to authenticated
  using ((select public.ourfamilymeta_is_admin()) or ((select public.ourfamilymeta_is_editor()) and owner = lower(auth.jwt() ->> 'email')));

-- 6) 사이트 공통 문구(settings)는 관리자만
drop policy if exists ourfamilymeta_settings_insert on public.ourfamilymeta_settings;
drop policy if exists ourfamilymeta_settings_update on public.ourfamilymeta_settings;
drop policy if exists ourfamilymeta_settings_delete on public.ourfamilymeta_settings;
create policy ourfamilymeta_settings_insert on public.ourfamilymeta_settings for insert to authenticated with check ((select public.ourfamilymeta_is_admin()));
create policy ourfamilymeta_settings_update on public.ourfamilymeta_settings for update to authenticated
  using ((select public.ourfamilymeta_is_admin())) with check ((select public.ourfamilymeta_is_admin()));
create policy ourfamilymeta_settings_delete on public.ourfamilymeta_settings for delete to authenticated using ((select public.ourfamilymeta_is_admin()));

-- 7) 파일 저장소: 업로드는 편집자, 덮어쓰기·삭제는 관리자만
drop policy if exists ourfamilymeta_media_editors_update on storage.objects;
drop policy if exists ourfamilymeta_media_editors_delete on storage.objects;
create policy ourfamilymeta_media_editors_update on storage.objects for update to authenticated
  using (bucket_id = 'ourfamilymeta-media' and (select public.ourfamilymeta_is_admin()))
  with check (bucket_id = 'ourfamilymeta-media' and (select public.ourfamilymeta_is_admin()));
create policy ourfamilymeta_media_editors_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ourfamilymeta-media' and (select public.ourfamilymeta_is_admin()));
