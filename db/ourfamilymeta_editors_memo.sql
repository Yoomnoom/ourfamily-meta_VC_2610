-- 편집자 목록에 이름·메모 칸 추가 (관리자만 고칠 수 있음)
alter table public.ourfamilymeta_editors add column if not exists memo text;

grant update on public.ourfamilymeta_editors to authenticated;

drop policy if exists ourfamilymeta_editors_admin_update on public.ourfamilymeta_editors;
create policy ourfamilymeta_editors_admin_update on public.ourfamilymeta_editors
  for update to authenticated
  using (public.ourfamilymeta_is_admin()) with check (public.ourfamilymeta_is_admin());
