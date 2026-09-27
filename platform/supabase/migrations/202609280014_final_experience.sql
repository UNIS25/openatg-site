-- Additive final experience. Preserve the existing authentication, RLS, audits and payment locks.
alter table public.v25_products add column display_order integer not null default 0 check(display_order between 0 and 10000);
-- No production price or food-label facts are invented. Only the local preview price is configured.
update public.v25_product_presentations set test_price_rappen=1290 where product_id=(select id from public.v25_products where slug='gelber-curry-kokos') and coalesce(test_price_rappen,0)=0 and exists(select 1 from v25_private.platform_runtime where local_test and not production_writes);
update public.v25_products set display_order=array_position(array['premium-black-tea-powder','green-tea-powder','masala-tea-powder','cinnamon-tea','cardamom-tea','gelber-curry-kokos'],slug) where slug=any(array['premium-black-tea-powder','green-tea-powder','masala-tea-powder','cinnamon-tea','cardamom-tea','gelber-curry-kokos']);

create or replace function public.v25_platform_catalogue() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',p.id,'slug',p.slug,'category',p.category,
 'translations',(select jsonb_agg(jsonb_build_object('locale',t.locale,'name',t.name,
  'description',case when p.information_confirmed then t.description else '' end,
  'short_description',case when p.information_confirmed then t.short_description else '' end,
  'ingredients',case when p.information_confirmed then t.ingredients else '' end,
  'allergens',case when p.information_confirmed then t.allergens else '' end,
  'preparation_instructions',case when p.information_confirmed then t.preparation_instructions else '' end,
  'storage_instructions',case when p.information_confirmed then t.storage_instructions else '' end)) from public.v25_product_translations t where t.product_id=p.id),
 'image',(select coalesce(legacy_path,'/api/image?path='||storage_path) from public.v25_product_images i where i.product_id=p.id order by position limit 1),
 'images',(select jsonb_agg(jsonb_build_object('url',coalesce(legacy_path,'/api/image?path='||storage_path),'alt',alt) order by position) from public.v25_product_images i where i.product_id=p.id),
 'price_rappen',case when p.status='active' and p.price_confirmed then p.price_rappen when r.local_test then nullif(s.test_price_rappen,0) end,
 'promotion_rappen',case when p.status='active' and p.price_confirmed then p.promotion_rappen end,
 'weight_grams',case when p.information_confirmed then p.weight_grams end,
 'origin',case when p.information_confirmed then p.origin else '' end,
 'nutrition',case when p.information_confirmed then p.nutrition else '{}'::jsonb end,
 'information_confirmed',p.information_confirmed,'stock_confirmed',i.confirmed,
 'available_quantity',case when i.confirmed or r.local_test then greatest(i.quantity,0) else 0 end,
 'is_test',not(p.status='active' and p.price_confirmed),'gold_eligible',s.gold_eligible
 ) order by p.display_order,p.slug),'[]')
 from public.v25_products p join public.v25_product_presentations s on s.product_id=p.id join public.v25_inventory i on i.product_id=p.id cross join v25_private.platform_runtime r
 where s.enabled and exists(select 1 from public.v25_product_images image_row where image_row.product_id=p.id)
 and p.status<>'archived' and not p.adult_only and p.category in ('tea','pantry')
 and (r.local_test or (p.status='active' and p.information_confirmed and p.price_confirmed and i.confirmed and p.published_at<=now()))
 and p.slug=any(array['premium-black-tea-powder','green-tea-powder','masala-tea-powder','cinnamon-tea','cardamom-tea','gelber-curry-kokos'])
$$;

create or replace function public.v25_save_product(document jsonb, expected_revision integer default null) returns uuid
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
    insert into public.v25_product_translations(product_id,locale,name,description,ingredients,allergens,storage_instructions,short_description,preparation_instructions,seo_title,seo_description)
      values(pid,tr->>'locale',coalesce(tr->>'name',''),coalesce(tr->>'description',''),coalesce(tr->>'ingredients',''),coalesce(tr->>'allergens',''),coalesce(tr->>'storage_instructions',''),coalesce(tr->>'short_description',''),coalesce(tr->>'preparation_instructions',''),coalesce(tr->>'seo_title',''),coalesce(tr->>'seo_description',''));
  end loop;
  delete from public.v25_product_images where product_id=pid;
  for im in select value from jsonb_array_elements(coalesce(document->'images','[]')) loop
    insert into public.v25_product_images(product_id,storage_path,legacy_path,position,alt)
      values(pid,im->>'storage_path',im->>'legacy_path',(im->>'position')::integer,coalesce(im->'alt','{}'));
  end loop;
  if wanted='active' then
    if not coalesce((document->>'information_confirmed')::boolean,false) or not coalesce((document->>'price_confirmed')::boolean,false) or coalesce((document->>'price_rappen')::integer,0)<=0 then raise exception 'Verified information and confirmed price required'; end if;
    if not exists(select 1 from public.v25_product_images where product_id=pid) then raise exception 'Product image required'; end if;
    if (select count(*) from public.v25_product_translations where product_id=pid and length(trim(name))>0 and length(trim(description))>0)<>3 then raise exception 'Complete DE, FR and EN translations before publishing'; end if;
    if not exists(select 1 from public.v25_inventory where product_id=pid and confirmed) then raise exception 'Confirm inventory before publishing'; end if;
    if nullif(trim(document->>'sku'),'') is null or nullif(trim(document->>'origin'),'') is null then raise exception 'SKU and country of origin required'; end if;
    if not coalesce((document->>'adult_only')::boolean,false) and (
      (document->>'weight_grams')::integer is null or document->'nutrition' is null or document->'nutrition'='{}'::jsonb or
      exists(select 1 from public.v25_product_translations where product_id=pid and (trim(ingredients)='' or trim(allergens)='' or trim(storage_instructions)='' or trim(preparation_instructions)=''))
    ) then raise exception 'Verified food label information required'; end if;
    if exists(select 1 from public.v25_product_images where product_id=pid and (coalesce(alt->>'de','')='' or coalesce(alt->>'fr','')='' or coalesce(alt->>'en','')='')) then raise exception 'Image alt text required in every language'; end if;
  end if;
  update public.v25_products set slug=document->>'slug',sku=nullif(trim(document->>'sku'),''),barcode=nullif(trim(document->>'barcode'),''),
    display_order=coalesce((document->>'display_order')::integer,old_row.display_order,0),category=coalesce(document->>'category',''),brand=coalesce(document->>'brand',''),supplier=coalesce(document->>'supplier',''),price_rappen=(document->>'price_rappen')::integer,
    promotion_rappen=(document->>'promotion_rappen')::integer,weight_grams=(document->>'weight_grams')::integer,origin=coalesce(document->>'origin',''),nutrition=coalesce(document->'nutrition','{}'),
    status=wanted,published_at=case when wanted='active' then coalesce(old_row.published_at,now()) else null end,
    available=coalesce((document->>'available')::boolean,false),featured=coalesce((document->>'featured')::boolean,false),most_picked=coalesce((document->>'most_picked')::boolean,false),
    adult_only=coalesce((document->>'adult_only')::boolean,false),information_confirmed=coalesce((document->>'information_confirmed')::boolean,false),price_confirmed=coalesce((document->>'price_confirmed')::boolean,false),
    revision=coalesce(old_row.revision,0)+1,updated_at=now() where id=pid;
  return pid;
end $$;

create or replace function public.v25_editorial_save(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint; item jsonb; locale_entry record; field_entry record;
begin
 perform v25_private.local_write();
 if not v25_private.platform_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
 if octet_length(input::text)>30000 or jsonb_typeof(input)<>'object' then raise exception 'Invalid editorial'; end if;
 if (select count(*) from jsonb_object_keys(input) k where k not in ('revision','invitation_enabled','invitation_delay_ms','invitation_start','invitation_end','active_film','chapter_order','copy','experience'))>0 then raise exception 'Invalid editorial key'; end if;
 if jsonb_typeof(input->'invitation_enabled') is distinct from 'boolean' or coalesce(input->>'invitation_delay_ms','') !~ '^[0-9]+$' or (input->>'invitation_delay_ms')::integer not between 12000 and 60000 then raise exception 'Invalid invitation'; end if;
 if coalesce(input->>'active_film','') not in ('daylight-study','poster-only') then raise exception 'Unapproved film'; end if;
 if jsonb_typeof(input->'chapter_order') is distinct from 'array' or jsonb_array_length(input->'chapter_order')<>4 then raise exception 'Invalid chapter order'; end if;
 if (select count(distinct value) from jsonb_array_elements_text(input->'chapter_order'))<>4 or not input->'chapter_order' <@ '["tea","spice","evening","restaurant"]'::jsonb then raise exception 'Invalid chapters'; end if;
 if input->>'invitation_start' is not null then perform (input->>'invitation_start')::timestamptz; end if;
 if input->>'invitation_end' is not null then perform (input->>'invitation_end')::timestamptz; end if;
 if (input->>'invitation_start')::timestamptz >= (input->>'invitation_end')::timestamptz then raise exception 'Invalid schedule'; end if;
 if input ? 'copy' then
  if jsonb_typeof(input->'copy')<>'object' then raise exception 'Invalid translations'; end if;
  for locale_entry in select * from jsonb_each(input->'copy') loop
   if locale_entry.key not in ('de','fr','en') or jsonb_typeof(locale_entry.value)<>'object' then raise exception 'Invalid locale'; end if;
   for field_entry in select * from jsonb_each(locale_entry.value) loop
    if field_entry.key not in ('heroTitle','heroText','teaTitle','teaText','spiceTitle','spiceText','eveningTitle','eveningText','restaurantTitle','restaurantText') or jsonb_typeof(field_entry.value)<>'string' or length(trim(field_entry.value #>> '{}')) not between 1 and 500 then raise exception 'Invalid copy'; end if;
   end loop;
  end loop;
 end if;
 if input ? 'experience' then
  item:=input->'experience';
  if jsonb_typeof(item) is distinct from 'object' or (select count(*) from jsonb_object_keys(item))<>4 or
     coalesce(item->>'gateway_film','') not in ('highlands','poster-only') or
     coalesce(item->>'store_film','') not in ('tea','poster-only') or
     coalesce(item->>'club_film','') not in ('evening','poster-only') or
     jsonb_typeof(item->'copy') is distinct from 'object' then raise exception 'Unapproved experience media'; end if;
  if (select count(*) from jsonb_object_keys(item->'copy'))<>3 then raise exception 'Three independent languages required'; end if;
  for locale_entry in select * from jsonb_each(item->'copy') loop
   if locale_entry.key not in ('de','fr','en') or jsonb_typeof(locale_entry.value) is distinct from 'object' then raise exception 'Invalid experience locale'; end if;
   if (select count(*) from jsonb_object_keys(locale_entry.value))<>13 then raise exception 'Complete experience copy required'; end if;
   for field_entry in select * from jsonb_each(locale_entry.value) loop
    if field_entry.key not in ('gatewayTitle','storeTitle','storeText','teaTitle','teaText','curryTitle','curryText','allTitle','allText','deliveryTitle','deliveryText','clubTitle','clubText') or jsonb_typeof(field_entry.value) is distinct from 'string' or length(trim(field_entry.value #>> '{}')) not between 1 and 500 then raise exception 'Invalid experience copy'; end if;
   end loop;
  end loop;
 end if;
 select revision into current_revision from public.v25_editorial_settings where id='homepage' for update;
 if current_revision is distinct from (input->>'revision')::bigint then raise exception 'Revision conflict'; end if;
 update public.v25_editorial_settings set document=input-'revision',revision=revision+1,updated_at=now() where id='homepage';
 return public.v25_editorial_public();
end $$;

notify pgrst, 'reload schema';
