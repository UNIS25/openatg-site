-- Enforce absolute session expiry in every RLS/RPC check, including direct API calls.
create or replace function v25_private.session_valid() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
 where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
 and (u.banned_until is null or u.banned_until<now()) and (s.not_after is null or s.not_after>now())
 and s.created_at>now()-make_interval(mins=>coalesce((select session_minutes from public.v25_platform_settings where id),480))
 and coalesce(s.refreshed_at,s.created_at)>now()-interval '1 hour')
$$;
create or replace function public.v25_platform_retention() returns jsonb language plpgsql security definer set search_path='' as $$
declare removed integer; expired integer; references_removed integer;
begin
 perform v25_private.local_write();
 update public.v25_memberships set status='expired',updated_at=now() where status='active' and period_end<=now();
 get diagnostics expired=row_count;
 update public.v25_member_verifications set status='expired',decision_reason='expired',age_threshold=null,revision=revision+1,updated_at=now() where status='verified' and expires_at<=now();
 update public.v25_member_verifications set provider_reference=null,revision=revision+1
 where provider_reference is not null and status in ('expired','rejected','revoked','resubmission_required')
 and updated_at<now()-make_interval(days=>(select verification_retention_days from public.v25_platform_settings where id));
 get diagnostics references_removed=row_count;
 delete from public.v25_member_passes where expires_at<now()-interval '1 day';get diagnostics removed=row_count;
 return jsonb_build_object('expired_memberships',expired,'removed_passes',removed,'removed_provider_references',references_removed);
end $$;
