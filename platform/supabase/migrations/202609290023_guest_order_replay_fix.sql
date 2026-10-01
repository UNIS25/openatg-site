-- Correct qualified idempotent payment lookup for guest orders.
create or replace function public.v25_guest_create_order(document jsonb, request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare fingerprint text:=md5(document::text); existing public.v25_orders; quote jsonb; customer uuid; address uuid; order_id uuid; payment_id uuid; row record; remaining integer; email text:=lower(trim(document->>'email')); name text:=trim(document->>'name'); street text:=trim(document->>'street'); house text:=trim(document->>'house_number'); postal text:=trim(document->>'postal_code'); city text:=trim(document->>'city'); loc text:=document->>'locale';
begin
 perform v25_private.local_write();
 if request_key is null or jsonb_typeof(document) is distinct from 'object' or (select count(*) from jsonb_object_keys(document))<>9 or exists(select 1 from jsonb_object_keys(document) key where key not in ('email','name','street','house_number','postal_code','city','locale','consent','lines')) then raise exception 'Invalid guest order'; end if;
 if email is null or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(email)>254 or length(name) not between 1 and 120 or length(street) not between 1 and 100 or length(house) not between 1 and 20 or postal !~ '^[1-9][0-9]{3}$' or length(city) not between 1 and 100 or loc not in ('de','fr','en') then raise exception 'Invalid guest details'; end if;
 if document->>'consent' is distinct from 'true' then raise exception 'Guest consent required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into existing from public.v25_orders where idempotency_key=request_key;
 if found then
  if existing.request_hash<>fingerprint or existing.member_id is not null then raise exception 'Idempotency conflict'; end if;
  select guest_payment.id into payment_id from public.v25_payments guest_payment where guest_payment.order_id=existing.id;
  return jsonb_build_object('order_id',existing.id,'payment_id',payment_id,'quote',existing.calculation,'replayed',true);
 end if;
 quote:=v25_private.platform_quote(document->'lines');
 insert into public.v25_customers(email,name) values(email,name) returning id into customer;
 insert into public.v25_addresses(customer_id,line1,postal_code,city) values(customer,street||' '||house,postal,city) returning id into address;
 insert into public.v25_orders(idempotency_key,request_hash,customer_id,address_id,locale,subtotal_rappen,discount_rappen,delivery_rappen,adult_delivery_rappen,tax_rappen,total_rappen,calculation,address_snapshot,is_test)
 values(request_key,fingerprint,customer,address,loc,(quote->>'subtotal_rappen')::integer,(quote->>'discount_rappen')::integer,(quote->>'delivery_rappen')::integer,0,0,(quote->>'total_rappen')::integer,quote,jsonb_build_object('name',name,'street',street,'house_number',house,'postal_code',postal,'city',city,'country','CH'),true) returning id into order_id;
 for row in select * from jsonb_to_recordset(quote->'lines') as x(product_id uuid,quantity integer,unit_rappen integer) loop
  insert into public.v25_order_items(order_id,product_id,quantity,name,unit_rappen) values(order_id,row.product_id,row.quantity,(select translation.name from public.v25_product_translations translation where translation.product_id=row.product_id and translation.locale=loc),row.unit_rappen);
  update public.v25_inventory set quantity=quantity-row.quantity where product_id=row.product_id returning quantity into remaining;
  insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,order_id) values(row.product_id,-row.quantity,remaining+row.quantity,remaining,'Local guest test order',order_id);
 end loop;
 payment_id:=gen_random_uuid();
 insert into public.v25_payments(id,order_id,reference,amount_rappen) values(payment_id,order_id,v25_private.rf_reference(payment_id),(quote->>'total_rappen')::integer);
 return jsonb_build_object('order_id',order_id,'payment_id',payment_id,'quote',quote,'replayed',false);
end $$;
notify pgrst, 'reload schema';
