-- Fail closed for all retained administration operations as well as new APIs.
create function v25_private.platform_write_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('request.jwt.claims',true),'')<>'' then perform v25_private.local_write(); end if;
 return coalesce(new,old);
end $$;
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'v25_%' and tablename<>'v25_audit_events' loop
  execute format('create trigger staging_write_guard before insert or update or delete on public.%I for each row execute function v25_private.platform_write_guard()',t.tablename);
 end loop;
end $$;
create function v25_private.no_tobacco_order() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.bundle_size is not null or exists(select 1 from public.v25_products where id=new.product_id and adult_only) then raise exception 'Tobacco ordering unavailable' using errcode='42501'; end if; return new; end $$;
create trigger no_tobacco_order before insert or update on public.v25_order_items for each row execute function v25_private.no_tobacco_order();
create function public.v25_platform_options() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('standard_rappen',standard_rappen,'threshold_rappen',threshold_rappen,'country',country) from public.v25_delivery_methods where id='standard-ch' and enabled
$$;
revoke all on function public.v25_platform_options() from public;
grant execute on function public.v25_platform_options() to anon,authenticated;
revoke all on function v25_private.platform_write_guard(),v25_private.no_tobacco_order() from public,anon,authenticated;
revoke all on all tables in schema v25_private from public,anon,authenticated;
