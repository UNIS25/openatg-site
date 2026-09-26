create function public.v25_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:='{}'; s public.v25_store_settings;
begin
 perform v25_private.require_role(array['owner','administrator','product_editor','order_manager']::public.v25_role[]);
 if v25_private.has_role(array['owner','administrator','product_editor']::public.v25_role[]) then
  result:=result||jsonb_build_object('active',(select count(*) from public.v25_products where status='active'),'draft',(select count(*) from public.v25_products where status='draft'),
   'low_stock',(select count(*) from public.v25_inventory where quantity<=low_stock_threshold),
   'incomplete_translations',(select count(*) from public.v25_products p where (select count(*) from public.v25_product_translations t where t.product_id=p.id and trim(name)<>'' and trim(description)<>'')<>3));
 end if;
 if v25_private.has_role(array['owner','administrator','order_manager']::public.v25_role[]) then
  result:=result||jsonb_build_object('orders',(select count(*) from public.v25_orders),'pending_fulfillment',(select count(*) from public.v25_orders where status in ('paid','preparing')),
   'revenue_rappen',(select coalesce(sum(total_rappen),0) from public.v25_orders where status in ('paid','preparing','dispatched','completed')),
   'recent_orders',(select coalesce(jsonb_agg(to_jsonb(o)),'[]') from(select id,number,status,total_rappen,created_at from public.v25_orders order by created_at desc limit 5)o));
 end if;
 select * into s from public.v25_store_settings where id;
 return result||jsonb_build_object('warnings',jsonb_build_object('delivery_unconfigured',s.standard_delivery_rappen is null,'payments_disabled',not s.payment_enabled,'tobacco_disabled',not s.tobacco_checkout_enabled,'maintenance',s.maintenance_mode,'store_closed',not s.store_available));
end $$;
revoke all on function public.v25_dashboard() from public,anon;
grant execute on function public.v25_dashboard() to authenticated;
-- Fail closed if someone accidentally grants table writes later: RLS has no write policies.
