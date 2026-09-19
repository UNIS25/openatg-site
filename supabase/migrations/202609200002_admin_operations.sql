create function public.v25_save_product(document jsonb, expected_revision integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid:=coalesce((document->>'id')::uuid,gen_random_uuid()); old_row public.v25_products;
  wanted public.v25_product_status:=coalesce(document->>'status','draft')::public.v25_product_status; tr jsonb; im jsonb;
begin
  perform v25_private.require_role(array['owner','administrator','product_editor']::public.v25_role[]);
  if wanted='active' then perform v25_private.require_role(array['owner','administrator']::public.v25_role[]); end if;
  select * into old_row from public.v25_products where id=pid for update;
  if found then
    if expected_revision is distinct from old_row.revision then raise exception 'Product changed. Reload before saving.' using errcode='40001'; end if;
  else
    if expected_revision is not null then raise exception 'Product no longer exists'; end if;
    insert into public.v25_products(id,slug) values(pid,document->>'slug');
    insert into public.v25_inventory(product_id) values(pid);
  end if;
  if jsonb_typeof(document->'translations') is distinct from 'array' then raise exception 'Translations required'; end if;
  delete from public.v25_product_translations where product_id=pid;
  for tr in select value from jsonb_array_elements(document->'translations') loop
    insert into public.v25_product_translations(product_id,locale,name,description,ingredients,allergens,storage_instructions)
      values(pid,tr->>'locale',coalesce(tr->>'name',''),coalesce(tr->>'description',''),coalesce(tr->>'ingredients',''),coalesce(tr->>'allergens',''),coalesce(tr->>'storage_instructions',''));
  end loop;
  delete from public.v25_product_images where product_id=pid;
  for im in select value from jsonb_array_elements(coalesce(document->'images','[]')) loop
    insert into public.v25_product_images(product_id,storage_path,legacy_path,position,alt)
      values(pid,im->>'storage_path',im->>'legacy_path',(im->>'position')::integer,coalesce(im->'alt','{}'));
  end loop;
  if wanted='active' then
    if (select count(*) from public.v25_product_translations where product_id=pid and length(trim(name))>0 and length(trim(description))>0)<>3 then raise exception 'Complete DE, FR and EN translations before publishing'; end if;
    if not exists(select 1 from public.v25_inventory where product_id=pid and confirmed) then raise exception 'Confirm inventory before publishing'; end if;
    if nullif(trim(document->>'sku'),'') is null or nullif(trim(document->>'origin'),'') is null then raise exception 'SKU and country of origin required'; end if;
    if not coalesce((document->>'adult_only')::boolean,false) and (
      (document->>'weight_grams')::integer is null or document->'nutrition' is null or document->'nutrition'='{}'::jsonb or
      exists(select 1 from public.v25_product_translations where product_id=pid and (trim(ingredients)='' or trim(allergens)='' or trim(storage_instructions)=''))
    ) then raise exception 'Verified food label information required'; end if;
    if exists(select 1 from public.v25_product_images where product_id=pid and (coalesce(alt->>'de','')='' or coalesce(alt->>'fr','')='' or coalesce(alt->>'en','')='')) then raise exception 'Image alt text required in every language'; end if;
  end if;
  update public.v25_products set slug=document->>'slug',sku=nullif(trim(document->>'sku'),''),barcode=nullif(trim(document->>'barcode'),''),
    category=coalesce(document->>'category',''),brand=coalesce(document->>'brand',''),price_rappen=(document->>'price_rappen')::integer,
    promotion_rappen=(document->>'promotion_rappen')::integer,weight_grams=(document->>'weight_grams')::integer,origin=coalesce(document->>'origin',''),nutrition=coalesce(document->'nutrition','{}'),
    status=wanted,published_at=case when wanted='active' then coalesce(old_row.published_at,now()) else null end,
    available=coalesce((document->>'available')::boolean,false),featured=coalesce((document->>'featured')::boolean,false),most_picked=coalesce((document->>'most_picked')::boolean,false),
    adult_only=coalesce((document->>'adult_only')::boolean,false),information_confirmed=coalesce((document->>'information_confirmed')::boolean,false),price_confirmed=coalesce((document->>'price_confirmed')::boolean,false),
    revision=coalesce(old_row.revision,0)+1,updated_at=now() where id=pid;
  return pid;
end $$;

create function public.v25_duplicate_product(product uuid, new_slug text, new_sku text) returns uuid
language plpgsql security definer set search_path='' as $$
declare doc jsonb;
begin
  perform v25_private.require_role(array['owner','administrator','product_editor']::public.v25_role[]);
  select to_jsonb(p)||jsonb_build_object('id',null,'slug',new_slug,'sku',new_sku,'barcode',null,'status','draft','information_confirmed',false,
    'translations',(select jsonb_agg(to_jsonb(t)) from public.v25_product_translations t where t.product_id=p.id),'images','[]'::jsonb)
    into doc from public.v25_products p where id=product;
  if doc is null then raise exception 'Product not found'; end if;
  return public.v25_save_product(doc,null);
end $$;

-- Quantity and confirmation cannot be changed through the product editor RPC.
create function public.v25_adjust_inventory(product uuid, delta integer, reason text, threshold integer default null) returns integer
language plpgsql security definer set search_path='' as $$
declare current_qty integer; next_qty integer;
begin
  perform v25_private.require_role(array['owner','administrator','product_editor']::public.v25_role[]);
  if delta is null or coalesce(length(trim(reason)),0) not between 3 and 500 then raise exception 'A specific adjustment reason is required'; end if;
  select quantity into current_qty from public.v25_inventory where product_id=product for update;
  if not found then raise exception 'Product not found'; end if;
  next_qty:=current_qty+delta;
  if next_qty<0 then raise exception 'Insufficient stock'; end if;
  update public.v25_inventory set quantity=next_qty,confirmed=true,low_stock_threshold=coalesce(threshold,low_stock_threshold) where product_id=product;
  if delta<>0 then
    insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,actor)
      values(product,delta,current_qty,next_qty,trim(reason),auth.uid());
  else
    insert into public.v25_audit_events(actor,action,entity,entity_id,detail) values(auth.uid(),'CONFIRM_STOCK','v25_inventory',product::text,jsonb_build_object('reason',trim(reason)));
  end if;
  return next_qty;
end $$;

create function public.v25_save_settings(document jsonb, expected_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare prev public.v25_store_settings; proposed public.v25_store_settings; k text;
begin
  perform v25_private.require_role(array['owner','administrator']::public.v25_role[]);
  select * into prev from public.v25_store_settings where id for update;
  if expected_revision is distinct from prev.revision then raise exception 'Settings changed. Reload before saving.' using errcode='40001'; end if;
  proposed:=jsonb_populate_record(prev,document - 'id' - 'revision');
  foreach k in array array['payment_enabled','tobacco_checkout_enabled','payment_provider_reference','legal_review_reference','age_verification_reference','adult_delivery_reference'] loop
    if to_jsonb(prev)->k is distinct from to_jsonb(proposed)->k then perform v25_private.require_role(array['owner']::public.v25_role[]); end if;
  end loop;
  proposed.id:=true; proposed.revision:=prev.revision+1;
  update public.v25_store_settings set
    standard_delivery_rappen=proposed.standard_delivery_rappen,free_delivery_threshold_rappen=proposed.free_delivery_threshold_rappen,adult_delivery_rappen=proposed.adult_delivery_rappen,
    tax_configuration_confirmed=proposed.tax_configuration_confirmed,vat_registered=proposed.vat_registered,vat_number=proposed.vat_number,vat_bps=proposed.vat_bps,prices_include_vat=proposed.prices_include_vat,
    contact_name=proposed.contact_name,contact_address=proposed.contact_address,contact_phone=proposed.contact_phone,support_email=proposed.support_email,
    store_available=proposed.store_available,maintenance_mode=proposed.maintenance_mode,payment_enabled=proposed.payment_enabled,tobacco_checkout_enabled=proposed.tobacco_checkout_enabled,
    payment_provider_reference=proposed.payment_provider_reference,legal_review_reference=proposed.legal_review_reference,age_verification_reference=proposed.age_verification_reference,adult_delivery_reference=proposed.adult_delivery_reference,
    bundle_discount_bps=proposed.bundle_discount_bps,revision=proposed.revision where id;
end $$;

create function public.v25_update_order(order_id uuid, next_status public.v25_order_status, notes text, tracking text, expected_revision integer, request_refund boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare prev public.v25_orders; item record; qty integer;
begin
  perform v25_private.require_role(array['owner','administrator','order_manager']::public.v25_role[]);
  select * into prev from public.v25_orders where id=order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if expected_revision is distinct from prev.revision then raise exception 'Order changed. Reload before saving.' using errcode='40001'; end if;
  if next_status is null or not (next_status=prev.status or
    (prev.status='pending' and next_status='cancelled') or
    (prev.status='paid' and next_status in ('preparing','cancelled')) or
    (prev.status='preparing' and next_status in ('dispatched','cancelled')) or
    (prev.status='dispatched' and next_status='completed')) then raise exception 'Invalid order transition; payment and refund confirmation require provider verification'; end if;
  if next_status='dispatched' and length(trim(tracking))=0 then raise exception 'Tracking number required'; end if;
  if request_refund and (prev.payment_reference is null or prev.refund_status='refunded') then raise exception 'No refundable payment'; end if;
  if next_status='cancelled' and not prev.stock_released then
    for item in
      select product_id,sum(n)::integer n from (
        select i.product_id,i.quantity n from public.v25_order_items i where i.order_id=prev.id and i.product_id is not null
        union all select b.product_id,i.quantity from public.v25_cigar_bundle_items b join public.v25_order_items i on i.id=b.order_item_id where i.order_id=prev.id
      ) q group by product_id order by product_id
    loop
      select quantity into qty from public.v25_inventory where product_id=item.product_id for update;
      update public.v25_inventory set quantity=quantity+item.n where product_id=item.product_id;
      insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,actor,order_id)
        values(item.product_id,item.n,qty,qty+item.n,'Order cancelled',auth.uid(),prev.id);
    end loop;
  end if;
  update public.v25_orders set status=next_status,fulfillment_notes=notes,tracking_number=tracking,revision=revision+1,updated_at=now(),
    stock_released=stock_released or next_status='cancelled',refund_status=case when request_refund then 'requested' else refund_status end where id=prev.id;
end $$;

create function public.v25_record_export(order_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
  perform v25_private.require_role(array['owner','administrator','order_manager']::public.v25_role[]);
  if cardinality(order_ids)>500 then raise exception 'Export at most 500 orders at once'; end if;
  insert into public.v25_audit_events(actor,action,entity,entity_id,detail)
    values(auth.uid(),'EXPORT','v25_orders','csv',jsonb_build_object('count',cardinality(order_ids)));
end $$;

create function public.v25_catalogue() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'category',p.category,'brand',p.brand,'price_rappen',p.price_rappen,
    'promotion_rappen',p.promotion_rappen,'weight_grams',p.weight_grams,'origin',p.origin,'nutrition',p.nutrition,'adult_only',p.adult_only,
    'featured',p.featured,'most_picked',p.most_picked,'available',p.available and i.quantity>0,'sku',p.sku,
    'translations',(select coalesce(jsonb_agg(to_jsonb(t)-'product_id'),'[]') from public.v25_product_translations t where t.product_id=p.id),
    'images',(select coalesce(jsonb_agg(to_jsonb(m)-'product_id' order by m.position),'[]') from public.v25_product_images m where m.product_id=p.id)
  ) order by p.slug),'[]') from public.v25_products p join public.v25_inventory i on i.product_id=p.id
  where p.status='active' and p.published_at<=now() and p.information_confirmed and p.price_confirmed
$$;
create function public.v25_public_settings() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('standard_delivery_rappen',standard_delivery_rappen,'free_delivery_threshold_rappen',free_delivery_threshold_rappen,
    'adult_delivery_rappen',adult_delivery_rappen,'store_available',store_available,'maintenance_mode',maintenance_mode,
    'payment_enabled',payment_enabled,'tobacco_checkout_enabled',tobacco_checkout_enabled,'bundle_discount_bps',bundle_discount_bps,
    'contact_name',contact_name,'contact_address',contact_address,'contact_phone',contact_phone,'support_email',support_email)
  from public.v25_store_settings where id
$$;

-- Private image bucket: unpublished media never gets an anonymous storage policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('v25-products','v25-products',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy v25_images_read on storage.objects for select to anon,authenticated using(bucket_id='v25-products' and (
  exists(select 1 from public.v25_product_images m join public.v25_products p on p.id=m.product_id
    where m.storage_path=name and p.status='active' and p.published_at<=now())
  or v25_private.has_role(array['owner','administrator','product_editor']::public.v25_role[])
));
-- The public check is a definer helper because catalogue base tables have no public grants.
create function v25_private.image_is_public(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.v25_product_images m join public.v25_products p on p.id=m.product_id where m.storage_path=path and p.status='active' and p.published_at<=now())
$$;
drop policy v25_images_read on storage.objects;
create policy v25_images_read on storage.objects for select to anon,authenticated using(bucket_id='v25-products' and (
 v25_private.image_is_public(name) or v25_private.has_role(array['owner','administrator','product_editor']::public.v25_role[])
));
create policy v25_images_insert on storage.objects for insert to authenticated with check(bucket_id='v25-products' and
 v25_private.has_role(array['owner','administrator','product_editor']::public.v25_role[]) and exists(select 1 from public.v25_products p where p.id::text=(storage.foldername(name))[1]));
create policy v25_images_delete on storage.objects for delete to authenticated using(bucket_id='v25-products' and v25_private.has_role(array['owner','administrator','product_editor']::public.v25_role[]));
-- Immutable object names; replacement uploads a new UUID and updates image metadata atomically.
grant usage on schema v25_private to anon;
grant execute on function v25_private.image_is_public(text),v25_private.has_role(public.v25_role[]) to anon,authenticated;
revoke all on function public.v25_save_product(jsonb,integer),public.v25_duplicate_product(uuid,text,text),public.v25_adjust_inventory(uuid,integer,text,integer),public.v25_save_settings(jsonb,integer),public.v25_update_order(uuid,public.v25_order_status,text,text,integer,boolean),public.v25_record_export(uuid[]) from public,anon;
grant execute on function public.v25_save_product(jsonb,integer),public.v25_duplicate_product(uuid,text,text),public.v25_adjust_inventory(uuid,integer,text,integer),public.v25_save_settings(jsonb,integer),public.v25_update_order(uuid,public.v25_order_status,text,text,integer,boolean),public.v25_record_export(uuid[]) to authenticated;
revoke all on function public.v25_catalogue(),public.v25_public_settings() from public;
grant execute on function public.v25_catalogue(),public.v25_public_settings() to anon,authenticated;
revoke all on function v25_private.image_is_public(text) from public;
