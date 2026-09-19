create function public.v25_quote(lines jsonb, adult_confirmed boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.v25_store_settings; line jsonb; selection jsonb; p public.v25_products; pid uuid; qty integer; n integer;
  unit_price bigint; subtotal bigint:=0; discount bigint:=0; net bigint; delivery integer; surcharge integer; adult boolean:=false;
  allocations jsonb:='{}'; result_lines jsonb:='[]'; composition jsonb; entry record; available_qty integer;
begin
  select * into s from public.v25_store_settings where id;
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 30 then raise exception 'Cart must contain 1 to 30 lines'; end if;
  for line in select value from jsonb_array_elements(lines) loop
    if (line->>'quantity') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Invalid quantity'; end if;
    qty:=(line->>'quantity')::integer;
    if qty is null or qty>100 then raise exception 'Invalid quantity'; end if;
    if line->>'kind'='single' then selection:=jsonb_build_array(line->>'product_id');
    elsif line->>'kind'='box' then
      if not coalesce((line->>'size') in ('4','6'),false) or jsonb_typeof(line->'product_ids') is distinct from 'array' then raise exception 'Choose a box of four or six cigars'; end if;
      if jsonb_array_length(line->'product_ids')<>(line->>'size')::integer then raise exception 'Incomplete cigar box'; end if;
      selection:=line->'product_ids';
    else raise exception 'Invalid cart line'; end if;
    unit_price:=0; composition:='[]';
    for pid in select value::uuid from jsonb_array_elements_text(selection) loop
      select * into p from public.v25_products where id=pid and status='active' and published_at<=now() and available and information_confirmed and price_confirmed;
      if not found then raise exception 'Product unavailable'; end if;
      if line->>'kind'='box' and (not p.adult_only or p.brand not in ('Patoro','Davidoff')) then raise exception 'Cigar boxes accept Patoro and Davidoff cigars only'; end if;
      if p.adult_only and not coalesce(adult_confirmed,false) then raise exception 'Adult confirmation required'; end if;
      adult:=adult or p.adult_only;
      unit_price:=unit_price+coalesce(p.promotion_rappen,p.price_rappen);
      n:=coalesce((allocations->>pid::text)::integer,0)+qty;
      allocations:=allocations||jsonb_build_object(pid::text,n);
      composition:=composition||jsonb_build_array(jsonb_build_object('product_id',pid,'unit_rappen',coalesce(p.promotion_rappen,p.price_rappen),'name',
        coalesce((select name from public.v25_product_translations where product_id=pid and locale='de'),p.sku)));
    end loop;
    if unit_price is null or jsonb_array_length(composition)=0 then raise exception 'Invalid selection'; end if;
    subtotal:=subtotal+unit_price*qty;
    if line->>'kind'='box' then discount:=discount+(unit_price*s.bundle_discount_bps/10000)*qty; end if;
    result_lines:=result_lines||jsonb_build_array(jsonb_build_object('kind',line->>'kind','quantity',qty,'size',line->'size','unit_rappen',unit_price,'composition',composition));
  end loop;
  for entry in select key,value from jsonb_each_text(allocations) loop
    select quantity into available_qty from public.v25_inventory where product_id=entry.key::uuid and confirmed;
    if available_qty is null or available_qty<entry.value::integer then raise exception 'Insufficient stock'; end if;
  end loop;
  net:=subtotal-discount;
  if subtotal>100000000 then raise exception 'Cart total exceeds maximum'; end if;
  delivery:=case when net>=s.free_delivery_threshold_rappen then 0 else s.standard_delivery_rappen end;
  surcharge:=case when adult then s.adult_delivery_rappen else 0 end;
  return jsonb_build_object('lines',result_lines,'allocations',allocations,'subtotal_rappen',subtotal,'discount_rappen',discount,'net_rappen',net,
    'delivery_rappen',delivery,'adult_delivery_rappen',surcharge,'total_rappen',net+delivery+surcharge,
    'remaining_rappen',greatest(s.free_delivery_threshold_rappen-net,0),'adult_only',adult,
    'purchasable',s.store_available and not s.maintenance_mode and s.payment_enabled and (not adult or s.tobacco_checkout_enabled) and delivery is not null and surcharge is not null);
end $$;
revoke all on function public.v25_quote(jsonb,boolean) from public;
grant execute on function public.v25_quote(jsonb,boolean) to anon,authenticated,service_role;

create table public.v25_age_verifications (
  id uuid primary key default gen_random_uuid(), subject_hash text not null,
  provider_reference text not null unique, verified_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked boolean not null default false
);
alter table public.v25_age_verifications enable row level security;
revoke all on public.v25_age_verifications from anon,authenticated;

create function public.v25_create_order(request jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare q jsonb; s public.v25_store_settings; oid uuid; cid uuid; aid uuid; iid uuid; item jsonb; part jsonb; idx integer; entry record;
  qty integer; old_qty integer; hash text; old_hash text; email text:=lower(trim(request->>'email')); idem uuid:=(request->>'idempotency_key')::uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
  if idem is null then raise exception 'Idempotency key required'; end if;
  hash:=encode(extensions.digest(request::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(idem::text,0));
  select id,request_hash into oid,old_hash from public.v25_orders where idempotency_key=idem;
  if found then
    if hash<>old_hash then raise exception 'Idempotency key already used with different input'; end if;
    return oid;
  end if;
  if email is null or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(email)>320 then raise exception 'Valid email required'; end if;
  if length(trim(coalesce(request->>'name',''))) not between 1 and 250 or length(trim(coalesce(request#>>'{address,line1}',''))) not between 1 and 250
    or length(trim(coalesce(request#>>'{address,city}',''))) not between 1 and 120 then raise exception 'Delivery address required'; end if;
  select * into s from public.v25_store_settings where id for share;
  if not s.store_available or s.maintenance_mode or not s.payment_enabled then raise exception 'Checkout is disabled'; end if;
  q:=public.v25_quote(request->'lines',coalesce((request->>'adult_confirmed')::boolean,false));
  -- Consistent lock ordering prevents deadlocks; requote after locking prevents overselling.
  perform 1 from public.v25_inventory where product_id in(select key::uuid from jsonb_each(q->'allocations')) order by product_id for update;
  q:=public.v25_quote(request->'lines',coalesce((request->>'adult_confirmed')::boolean,false));
  if not (q->>'purchasable')::boolean then raise exception 'Delivery or payment is not configured'; end if;
  if (q->>'adult_only')::boolean and not exists(select 1 from public.v25_age_verifications where id=(request->>'age_verification_id')::uuid
    and subject_hash=encode(extensions.digest(email,'sha256'),'hex') and not revoked and expires_at>now()) then raise exception 'Verified adult identity required'; end if;
  insert into public.v25_customers(email,name) values(email,trim(request->>'name')) returning id into cid;
  insert into public.v25_addresses(customer_id,line1,line2,postal_code,city,country)
    values(cid,trim(request#>>'{address,line1}'),coalesce(request#>>'{address,line2}',''),request#>>'{address,postal_code}',trim(request#>>'{address,city}'),request#>>'{address,country}') returning id into aid;
  insert into public.v25_orders(idempotency_key,request_hash,customer_id,address_id,locale,subtotal_rappen,discount_rappen,delivery_rappen,adult_delivery_rappen,tax_rappen,total_rappen)
    values(idem,hash,cid,aid,request->>'locale',(q->>'subtotal_rappen')::integer,(q->>'discount_rappen')::integer,(q->>'delivery_rappen')::integer,(q->>'adult_delivery_rappen')::integer,
      case when s.vat_registered then round((q->>'total_rappen')::numeric*s.vat_bps/(10000+s.vat_bps))::integer else 0 end,(q->>'total_rappen')::integer) returning id into oid;
  for item in select value from jsonb_array_elements(q->'lines') loop
    insert into public.v25_order_items(order_id,product_id,bundle_size,quantity,name,unit_rappen)
      values(oid,case when item->>'kind'='single' then (item#>>'{composition,0,product_id}')::uuid else null end,
        case when item->>'kind'='box' then (item->>'size')::integer else null end,(item->>'quantity')::integer,
        case when item->>'kind'='box' then 'Cigar box '||(item->>'size') else item#>>'{composition,0,name}' end,(item->>'unit_rappen')::integer) returning id into iid;
    if item->>'kind'='box' then
      idx:=0;
      for part in select value from jsonb_array_elements(item->'composition') loop
        insert into public.v25_cigar_bundle_items(order_item_id,position,product_id,name,unit_rappen)
          values(iid,idx,(part->>'product_id')::uuid,part->>'name',(part->>'unit_rappen')::integer);
        idx:=idx+1;
      end loop;
    end if;
  end loop;
  for entry in select key,value from jsonb_each_text(q->'allocations') loop
    qty:=entry.value::integer;
    select quantity into old_qty from public.v25_inventory where product_id=entry.key::uuid;
    update public.v25_inventory set quantity=quantity-qty where product_id=entry.key::uuid;
    insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,order_id)
      values(entry.key::uuid,-qty,old_qty,old_qty-qty,'Order reservation',oid);
  end loop;
  return oid;
end $$;
revoke all on function public.v25_create_order(jsonb) from public,anon,authenticated;
grant execute on function public.v25_create_order(jsonb) to service_role;

create table public.v25_payment_events (
 id text primary key, order_id uuid not null references public.v25_orders(id), event text not null, created_at timestamptz not null default now()
);
alter table public.v25_payment_events enable row level security;
revoke all on public.v25_payment_events from anon,authenticated;
create function public.v25_payment_event(order_id uuid,event_id text,payment_reference text,event text,amount_rappen integer,currency text) returns void
language plpgsql security definer set search_path='' as $$
declare prev public.v25_orders;
begin
  if auth.role()<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
  select * into prev from public.v25_orders where id=order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if currency is distinct from 'CHF' or amount_rappen is distinct from prev.total_rappen or coalesce(length(trim(payment_reference)),0)=0 then raise exception 'Payment amount, currency or reference mismatch'; end if;
  if exists(select 1 from public.v25_payment_events e where e.id=event_id and e.order_id=prev.id and e.event=v25_payment_event.event) then return; end if;
  if (event='paid' and prev.status<>'pending') or (event='refunded' and (prev.payment_reference is distinct from payment_reference or prev.status not in ('paid','preparing','dispatched','completed','cancelled'))) or event not in ('paid','refunded') then raise exception 'Invalid provider event'; end if;
  insert into public.v25_payment_events(id,order_id,event) values(event_id,prev.id,event);
  update public.v25_orders set status=event::public.v25_order_status,payment_reference=v25_payment_event.payment_reference,
    refund_status=case when event='refunded' then 'refunded' else refund_status end,revision=revision+1,updated_at=now() where id=prev.id;
end $$;
revoke all on function public.v25_payment_event(uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.v25_payment_event(uuid,text,text,text,integer,text) to service_role;
