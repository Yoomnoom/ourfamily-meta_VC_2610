-- 같은 세계관 연결('worlds' 행)을 등록된 편집자 모두가 수정할 수 있게 한다.
-- 사이트 공통 'site' 행은 그대로 관리자만. 'album'(비하인드 컷)·'worlds'(같은 세계관 연결) 행만 편집자(관리자 포함)에게 연다.
-- Supabase SQL Editor 에서 한 번 실행. 여러 번 실행해도 안전하다.
-- 순서: 이 SQL 먼저 → 그다음 CMS·사이트 배포.

drop policy if exists ourfamilymeta_settings_worlds_insert on public.ourfamilymeta_settings;
drop policy if exists ourfamilymeta_settings_worlds_update on public.ourfamilymeta_settings;

create policy ourfamilymeta_settings_worlds_insert on public.ourfamilymeta_settings
  for insert to authenticated
  with check (key = 'worlds' and (select public.ourfamilymeta_is_editor()));

create policy ourfamilymeta_settings_worlds_update on public.ourfamilymeta_settings
  for update to authenticated
  using (key = 'worlds' and (select public.ourfamilymeta_is_editor()))
  with check (key = 'worlds' and (select public.ourfamilymeta_is_editor()));

-- 삭제는 예전처럼 관리자만(기존 정책). 읽기는 모두(기존 정책).
