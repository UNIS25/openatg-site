-- Additive editorial staging configuration. No commerce/authentication table is changed.
create table public.v25_editorial_settings (
 id text primary key check(id='homepage'), revision bigint not null default 0,
 document jsonb not null, updated_at timestamptz not null default now()
);
insert into public.v25_editorial_settings(id,document) values('homepage',
 '{"invitation_enabled":true,"invitation_delay_ms":12000,"invitation_start":null,"invitation_end":null,"active_film":"daylight-study","chapter_order":["tea","spice","evening","restaurant"]}');
create table public.v25_media_assets (
 id uuid primary key default gen_random_uuid(), storage_path text unique,
 original_filename text not null check(length(original_filename) between 1 and 200),
 mime_type text not null check(mime_type in ('image/webp','image/jpeg','image/png','video/mp4','video/webm')),
 bytes bigint not null check(bytes between 1 and 20971520),
 rights_owner text, source_reference text, licence_type text, attribution text,
 commercial_approved boolean not null default false,
 approval_reference text, approved_by uuid references auth.users(id), approved_at timestamptz,
 status text not null default 'quarantined' check(status in ('quarantined','validated','approved','rejected')),
 width integer check(width between 1 and 3840), height integer check(height between 1 and 2160),
 duration_ms integer check(duration_ms between 1 and 30000),
 has_audio boolean not null default false check(not has_audio),
 created_at timestamptz not null default now(),
 check(not commercial_approved or (status='approved' and coalesce(length(rights_owner)>1,false) and coalesce(length(licence_type)>1,false) and coalesce(length(approval_reference)>2,false) and approved_by is not null and approved_at is not null)),
 check(storage_path is null or storage_path ~ '^quarantine/[a-f0-9-]{36}\.(webp|png|jpeg|mp4|webm)$')
);
alter table public.v25_editorial_settings enable row level security;
alter table public.v25_media_assets enable row level security;
revoke all on public.v25_editorial_settings,public.v25_media_assets from anon,authenticated;
grant select on public.v25_editorial_settings,public.v25_media_assets to authenticated;
create policy editorial_admin_read on public.v25_editorial_settings for select to authenticated using(v25_private.platform_admin());
create policy media_admin_read on public.v25_media_assets for select to authenticated using(v25_private.platform_admin());
create trigger editorial_audit after insert or update or delete on public.v25_editorial_settings for each row execute function v25_private.audit();
create trigger media_audit after insert or update or delete on public.v25_media_assets for each row execute function v25_private.audit();
create trigger editorial_write_guard before insert or update or delete on public.v25_editorial_settings for each row execute function v25_private.platform_write_guard();
create trigger media_write_guard before insert or update or delete on public.v25_media_assets for each row execute function v25_private.platform_write_guard();
-- Quarantine storage is not publicly readable or writable. Only a future approved server-side
-- validation worker may ingest. No direct browser upload grant or signed public link exists.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('v25-editorial-private','v25-editorial-private',false,20971520,array['image/webp','image/png','image/jpeg','video/mp4','video/webm']);
create policy editorial_storage_admin_read on storage.objects for select to authenticated using(bucket_id='v25-editorial-private' and v25_private.platform_admin());
create function public.v25_editorial_public() returns jsonb language sql stable security definer set search_path='' as $$
 select document || jsonb_build_object('revision',revision) from public.v25_editorial_settings where id='homepage'
$$;
create function public.v25_editorial_save(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint; item jsonb; locale_entry record; field_entry record;
begin
 perform v25_private.local_write();
 if not v25_private.platform_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
 if octet_length(input::text)>30000 or jsonb_typeof(input)<>'object' then raise exception 'Invalid editorial'; end if;
 if (select count(*) from jsonb_object_keys(input) k where k not in ('revision','invitation_enabled','invitation_delay_ms','invitation_start','invitation_end','active_film','chapter_order','copy'))>0 then raise exception 'Invalid editorial key'; end if;
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
 select revision into current_revision from public.v25_editorial_settings where id='homepage' for update;
 if current_revision is distinct from (input->>'revision')::bigint then raise exception 'Revision conflict'; end if;
 update public.v25_editorial_settings set document=input-'revision',revision=revision+1,updated_at=now() where id='homepage';
 return public.v25_editorial_public();
end $$;
revoke all on function public.v25_editorial_public(),public.v25_editorial_save(jsonb) from public,anon,authenticated;
grant execute on function public.v25_editorial_public() to anon,authenticated;
grant execute on function public.v25_editorial_save(jsonb) to authenticated;
