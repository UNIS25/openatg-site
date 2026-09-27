-- Reuse the authoritative local calculation without granting table access or order writes.
create function public.v25_platform_preview_quote(lines jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform v25_private.local_write();
 if auth.uid() is not null and not v25_private.platform_member() then raise exception 'Not authorized' using errcode='42501'; end if;
 return v25_private.platform_quote(lines);
end $$;
revoke all on function public.v25_platform_preview_quote(jsonb) from public;
grant execute on function public.v25_platform_preview_quote(jsonb) to anon,authenticated;
notify pgrst, 'reload schema';
