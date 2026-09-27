-- JSON null and arrays are not verified nutrition objects. Preserve all existing publish gates.
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
      (document->>'weight_grams')::integer is null or jsonb_typeof(document->'nutrition') is distinct from 'object' or document->'nutrition'='{}'::jsonb or
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

notify pgrst, 'reload schema';
