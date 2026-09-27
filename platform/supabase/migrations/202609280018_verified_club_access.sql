-- Additive verified-access workflow. No production enablement and no tobacco commerce.
alter table public.v25_member_verifications
 add column submission_id uuid,
 add column method text check(method in ('local-review','provider','legacy-test')),
 add column age_threshold integer check(age_threshold=18),
 add column submitted_at timestamptz,
 add column decided_at timestamptz,
 add column reviewer_id uuid references auth.users(id),
 add column decision_reason text check(decision_reason in ('age_confirmed','age_not_confirmed','evidence_incomplete','expired','access_revoked','account_suspended')),
 add column revision integer not null default 1;
alter table public.v25_member_verifications drop constraint v25_member_verifications_status_check;
alter table public.v25_member_verifications add constraint v25_member_verifications_status_check
 check(status in ('pending','verified','rejected','expired','manual_review','resubmission_required','revoked'));
-- Retain existing explicitly marked local review fixtures; never infer production verification.
update public.v25_member_verifications set method='legacy-test',age_threshold=case when status='verified' then 18 end,
 submitted_at=coalesce(verified_at,updated_at),decided_at=verified_at where is_test;
alter table public.v25_platform_settings add column admin_mfa_required boolean not null default false;

create or replace function v25_private.has_role(allowed public.v25_role[]) returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.session_valid() and exists(select 1 from public.v25_profiles p join public.v25_members m on m.id=p.id
 where p.id=auth.uid() and p.enabled and m.state='active' and p.role=any(allowed)
 and (p.role<>'owner' or auth.jwt()->>'aal'='aal2')
 and (p.role<>'administrator' or not coalesce((select admin_mfa_required from public.v25_platform_settings where id),true) or auth.jwt()->>'aal'='aal2'))
$$;
create or replace function v25_private.platform_verified(member uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.v25_member_verifications v join public.v25_members m on m.id=v.member_id join auth.users u on u.id=m.id
 where m.id=member and m.state='active' and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
 and v.status='verified' and v.age_threshold=18 and v.verified_at<=now() and v.expires_at>now()
 and (not v.is_test or (select local_test from v25_private.platform_runtime where id)))
$$;
create function v25_private.club_account_state(member uuid) returns text language sql stable security definer set search_path='' as $$
 select case when member is null then 'guest'
 when exists(select 1 from public.v25_members where id=member and state<>'active') then 'suspended'
 when v25_private.platform_verified(member) then 'verified_18_plus'
 when v.status in ('rejected','resubmission_required','revoked') then 'verification_rejected'
 when v.status='expired' or (v.status='verified' and v.expires_at<=now()) then 'verification_expired'
 when v.submitted_at is not null and v.status in ('pending','manual_review') then 'verification_pending'
 else 'registered_unverified' end
 from (select 1) seed left join public.v25_member_verifications v on v.member_id=member
$$;
create function v25_private.club_membership_state(member uuid) returns text language sql stable security definer set search_path='' as $$
 select case when m.status='suspended' then 'membership_suspended'
 when m.status='active' and p.tier='silver' then 'silver'
 when m.status='active' and p.tier='gold' and m.period_end>now() then 'gold'
 when p.tier='gold' and (m.status='past_due' or (m.status='active' and m.period_end<=now())) then 'gold_past_due'
 when p.tier='gold' and m.status in ('cancelled','expired') then 'gold_cancelled'
 else 'none' end from (select 1) seed left join public.v25_memberships m on m.member_id=member left join public.v25_membership_plans p on p.id=m.plan_id
$$;
create or replace function public.v25_platform_identity() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('active',v25_private.platform_member(),'verified',v25_private.platform_verified(auth.uid()),'gold',v25_private.platform_gold(auth.uid()),
 'admin',v25_private.platform_admin(),'staff',v25_private.platform_staff(),'role',(select role from public.v25_profiles where id=auth.uid() and enabled and v25_private.has_role(array[role])),
 'account_state',v25_private.club_account_state(auth.uid()),'membership_state',v25_private.club_membership_state(auth.uid())) where v25_private.session_valid()
$$;
-- Preserve the mature commerce implementation, but remove every self-approval route at the database boundary.
alter function public.v25_platform_action(text,jsonb,uuid) set schema v25_private;
alter function v25_private.v25_platform_action(text,jsonb,uuid) rename to platform_action_legacy;
revoke all on function v25_private.platform_action_legacy(text,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.v25_platform_action(action text,document jsonb default '{}',request_key uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if action in ('test_verification','verification_review') then raise exception 'Authorized verification workflow required' using errcode='42501'; end if;
 if action='membership' and exists(select 1 from public.v25_memberships where member_id=auth.uid() and status='suspended') then raise exception 'Membership suspended' using errcode='42501'; end if;
 return v25_private.platform_action_legacy(action,document,request_key);
end $$;
revoke all on function public.v25_platform_action(text,jsonb,uuid) from public,anon;
grant execute on function public.v25_platform_action(text,jsonb,uuid) to authenticated;

create function public.v25_verification_submit(reference text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.v25_member_verifications;
begin
 perform v25_private.local_write();
 if not v25_private.platform_member() then raise exception 'Active confirmed account required' using errcode='42501'; end if;
 if reference !~ '^local-review-[a-f0-9-]{36}$' then raise exception 'Invalid provider reference'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||'verification',0));
 select * into v from public.v25_member_verifications where member_id=auth.uid() for update;
 if v25_private.platform_verified(auth.uid()) then raise exception 'Already verified'; end if;
 if v.submitted_at is not null and v.status in ('pending','manual_review') then raise exception 'Verification already pending'; end if;
 if exists(select 1 from public.v25_audit_events where actor=auth.uid() and action='verification_submitted' and created_at>now()-interval '1 minute') then raise exception 'Rate limit'; end if;
 insert into public.v25_member_verifications(member_id,submission_id,provider_reference,method,status,submitted_at,is_test)
 values(auth.uid(),gen_random_uuid(),reference,'local-review','pending',now(),true)
 on conflict(member_id) do update set submission_id=excluded.submission_id,provider_reference=excluded.provider_reference,method=excluded.method,status='pending',submitted_at=now(),decided_at=null,reviewer_id=null,decision_reason=null,verified_at=null,expires_at=null,age_threshold=null,is_test=true,revision=v25_member_verifications.revision+1,updated_at=now() returning * into v;
 insert into public.v25_audit_events(actor,action,entity,entity_id,detail) values(auth.uid(),'verification_submitted','v25_member_verifications',auth.uid()::text,jsonb_build_object('submission_id',v.submission_id,'is_test',true));
 return jsonb_build_object('status','verification_pending','submission_id',v.submission_id);
end $$;
revoke all on function public.v25_verification_submit(text) from public,anon;
grant execute on function public.v25_verification_submit(text) to authenticated;

create function public.v25_verification_review(member uuid,decision text,reason text,expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.v25_member_verifications; target text;
begin
 perform v25_private.local_write();
 if not v25_private.platform_admin() or member=auth.uid() then raise exception 'Independent authorized administrator required' using errcode='42501'; end if;
 if decision not in ('approve','reject','resubmit','revoke','expire','suspend') then raise exception 'Invalid review decision'; end if;
 if reason not in ('age_confirmed','age_not_confirmed','evidence_incomplete','expired','access_revoked','account_suspended') then raise exception 'Non-sensitive reason code required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text||'verification',0));
 select * into v from public.v25_member_verifications where member_id=member for update;
 if not found or v.revision<>expected_revision then raise exception 'Review revision conflict'; end if;
 if decision='approve' then
  if not v.is_test or v.method<>'local-review' or v.submitted_at is null or v.status not in ('pending','manual_review') then raise exception 'Pending local provider review required'; end if;
  if not exists(select 1 from public.v25_members m join auth.users u on u.id=m.id where m.id=member and m.state='active' and u.email_confirmed_at is not null) then raise exception 'Active confirmed account required'; end if;
  if reason<>'age_confirmed' then raise exception 'Approval reason required'; end if;
 end if;
 target:=case decision when 'approve' then 'verified' when 'reject' then 'rejected' when 'resubmit' then 'resubmission_required' when 'expire' then 'expired' else 'revoked' end;
 update public.v25_member_verifications set status=target,decided_at=now(),reviewer_id=auth.uid(),decision_reason=reason,
 age_threshold=case when decision='approve' then 18 else null end,
 verified_at=case when decision='approve' then now() else verified_at end,
 expires_at=case when decision='approve' then now()+interval '365 days' when decision in ('expire','revoke','suspend') then now() else expires_at end,
 revision=revision+1,updated_at=now() where member_id=member;
 if decision='suspend' then update public.v25_members set state='suspended',updated_at=now() where id=member; end if;
 if decision<>'approve' then update public.v25_member_passes set revoked_at=now() where member_id=member and revoked_at is null; end if;
 insert into public.v25_audit_events(actor,action,entity,entity_id,detail) values(auth.uid(),'verification_'||decision,'v25_member_verifications',member::text,
 jsonb_build_object('reason',reason,'submission_id',v.submission_id,'is_test',v.is_test,'status_before',v.status,'status_after',target));
 return jsonb_build_object('status',v25_private.club_account_state(member));
end $$;
revoke all on function public.v25_verification_review(uuid,text,text,integer) from public,anon;
grant execute on function public.v25_verification_review(uuid,text,text,integer) to authenticated;
create function public.v25_verification_mfa(required boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform v25_private.local_write();perform v25_private.require_role(array['owner']::public.v25_role[]);
 update public.v25_platform_settings set admin_mfa_required=required,revision=revision+1 where id;
end $$;
revoke all on function public.v25_verification_mfa(boolean) from public,anon;
grant execute on function public.v25_verification_mfa(boolean) to authenticated;
revoke all on function v25_private.club_account_state(uuid),v25_private.club_membership_state(uuid) from public,anon,authenticated,service_role;
