-- Private worker boundary. It is never scheduled or enabled in hosted production by this branch.
create function public.v25_platform_retention() returns jsonb language plpgsql security definer set search_path='' as $$
declare removed integer; expired integer;
begin
 perform v25_private.local_write();
 update public.v25_memberships set status='expired',updated_at=now() where status='active' and period_end<=now();
 get diagnostics expired=row_count;
 update public.v25_member_verifications set status='expired',updated_at=now() where status='verified' and expires_at<=now();
 update public.v25_member_verifications set provider_reference=null where status in ('expired','rejected') and updated_at<now()-make_interval(days=>(select verification_retention_days from public.v25_platform_settings where id));
 delete from public.v25_member_passes where expires_at<now()-interval '1 day';
 get diagnostics removed=row_count;
 return jsonb_build_object('expired_memberships',expired,'removed_passes',removed);
end $$;
revoke all on function public.v25_platform_retention() from public,anon,authenticated;
grant execute on function public.v25_platform_retention() to service_role;
