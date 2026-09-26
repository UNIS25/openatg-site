-- A suspended/deletion-requested account loses staff and administrative access too.
create or replace function v25_private.has_role(allowed public.v25_role[]) returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.session_valid() and exists(select 1 from public.v25_profiles p join public.v25_members m on m.id=p.id
 where p.id=auth.uid() and p.enabled and m.state='active' and p.role=any(allowed) and (p.role<>'owner' or auth.jwt()->>'aal'='aal2'))
$$;
-- The original storage policy invokes this predicate; anonymous sessions always fail its role check.
grant execute on function v25_private.has_role(public.v25_role[]) to anon;
create function v25_private.presentation_on_publish() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='active' and not new.adult_only and new.category in ('tea','pantry') then
  insert into public.v25_product_presentations(product_id,enabled) values(new.id,true) on conflict(product_id) do update set enabled=true;
 end if;
 return new;
end $$;
create trigger presentation_publish after insert or update on public.v25_products for each row execute function v25_private.presentation_on_publish();
revoke all on function v25_private.presentation_on_publish() from public,anon,authenticated;
