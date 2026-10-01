-- Preserve the approved editorial configuration while selecting the neutral licensed gateway film.
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
     coalesce(item->>'gateway_film','') not in ('highlands','evening','poster-only') or
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

update public.v25_editorial_settings set document=jsonb_set(document,'{experience,gateway_film}', '"evening"'::jsonb), revision=revision+1, updated_at=now() where id='homepage' and document#>>'{experience,gateway_film}'='highlands';
notify pgrst, 'reload schema';
