create function public.v25_owner_authorized() returns boolean language plpgsql stable security definer set search_path='' as $$
begin perform v25_private.require_role(array['owner']::public.v25_role[]);return true;end $$;
create function public.v25_change_access(profile_id uuid,new_role public.v25_role,is_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform v25_private.require_role(array['owner']::public.v25_role[]);
 if profile_id=auth.uid() then raise exception 'Owners cannot remove or change their own access'; end if;
 update public.v25_profiles set role=new_role,enabled=is_enabled where id=profile_id;
 if not found then raise exception 'Administrator not found'; end if;
end $$;
revoke all on function public.v25_owner_authorized(),public.v25_change_access(uuid,public.v25_role,boolean) from public,anon;
grant execute on function public.v25_owner_authorized(),public.v25_change_access(uuid,public.v25_role,boolean) to authenticated;
