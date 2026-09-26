-- Varathans25. Private tables; the public catalogue is an explicit, read-only projection.
create schema if not exists v25_private;
revoke all on schema v25_private from public;
create type public.v25_role as enum ('owner','administrator','product_editor','order_manager');
create type public.v25_product_status as enum ('draft','active','archived');
create type public.v25_order_status as enum ('pending','paid','preparing','dispatched','completed','cancelled','refunded');

create table public.v25_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.v25_role not null,
  enabled boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.v25_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=120),
  sku text unique check (length(sku)<=120), barcode text check(length(barcode)<=80),
  category text not null default '', brand text not null default '',
  price_rappen integer check(price_rappen between 0 and 100000000),
  promotion_rappen integer check(promotion_rappen between 0 and price_rappen),
  weight_grams integer check(weight_grams > 0), origin text not null default '',
  nutrition jsonb not null default '{}',
  status public.v25_product_status not null default 'draft', published_at timestamptz,
  available boolean not null default false, featured boolean not null default false,
  most_picked boolean not null default false, adult_only boolean not null default false,
  information_confirmed boolean not null default false, price_confirmed boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status <> 'active' or (published_at is not null and price_rappen is not null and price_confirmed and information_confirmed))
);
create table public.v25_product_translations (
  product_id uuid not null references public.v25_products(id) on delete cascade,
  locale text not null check(locale in ('de','fr','en')),
  name text not null default '' check(length(name)<=250), description text not null default '' check(length(description)<=20000),
  ingredients text not null default '', allergens text not null default '', storage_instructions text not null default '',
  primary key(product_id,locale)
);
create table public.v25_product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.v25_products(id) on delete cascade,
  storage_path text, legacy_path text,
  position integer not null check(position between 0 and 30), alt jsonb not null default '{}',
  unique(product_id,position),
  check ((storage_path is not null)::integer + (legacy_path is not null)::integer = 1),
  check(storage_path is null or (storage_path like product_id::text || '/%' and storage_path !~ '\.\.')),
  check(legacy_path is null or (legacy_path ~ '^/varathans25/images/[A-Za-z0-9/_-]+\.(webp|png|jpg|svg)$' and legacy_path !~ '\.\.'))
);
create table public.v25_inventory (
  product_id uuid primary key references public.v25_products(id),
  quantity integer not null default 0 check(quantity between 0 and 1000000),
  low_stock_threshold integer not null default 5 check(low_stock_threshold between 0 and 1000000),
  confirmed boolean not null default false
);
create table public.v25_customers (
  id uuid primary key default gen_random_uuid(), email text not null check(length(email)<=320),
  name text not null check(length(name) between 1 and 250), created_at timestamptz not null default now()
);
create table public.v25_addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.v25_customers(id),
  line1 text not null, line2 text not null default '', postal_code text not null check(postal_code ~ '^[1-9][0-9]{3}$'),
  city text not null, country text not null default 'CH' check(country='CH')
);
create table public.v25_orders (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
  idempotency_key uuid not null unique, request_hash text not null,
  customer_id uuid not null references public.v25_customers(id), address_id uuid not null references public.v25_addresses(id),
  locale text not null check(locale in ('de','fr','en')),
  status public.v25_order_status not null default 'pending',
  subtotal_rappen integer not null check(subtotal_rappen >= 0), discount_rappen integer not null check(discount_rappen between 0 and subtotal_rappen),
  delivery_rappen integer not null check(delivery_rappen >= 0), adult_delivery_rappen integer not null check(adult_delivery_rappen >= 0),
  tax_rappen integer not null check(tax_rappen >= 0), total_rappen integer not null check(total_rappen>=0),
  payment_reference text unique, refund_status text not null default 'none' check(refund_status in ('none','requested','refunded','failed')),
  fulfillment_notes text not null default '' check(length(fulfillment_notes)<=5000), tracking_number text not null default '' check(length(tracking_number)<=250),
  revision integer not null default 1, stock_released boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(total_rappen = subtotal_rappen - discount_rappen + delivery_rappen + adult_delivery_rappen)
);
create table public.v25_order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.v25_orders(id),
  product_id uuid references public.v25_products(id), bundle_size integer check(bundle_size in (4,6)),
  quantity integer not null check(quantity between 1 and 100), name text not null,
  unit_rappen integer not null check(unit_rappen>=0),
  check ((product_id is not null)::integer + (bundle_size is not null)::integer = 1)
);
create table public.v25_cigar_bundle_items (
  order_item_id uuid not null references public.v25_order_items(id), position integer not null check(position between 0 and 5),
  product_id uuid not null references public.v25_products(id), name text not null, unit_rappen integer not null check(unit_rappen>=0),
  primary key(order_item_id,position)
);
create table public.v25_inventory_movements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.v25_products(id),
  delta integer not null check(delta<>0), previous_quantity integer not null check(previous_quantity>=0),
  new_quantity integer not null check(new_quantity>=0), reason text not null check(length(trim(reason)) between 3 and 500),
  actor uuid references auth.users(id), order_id uuid references public.v25_orders(id), created_at timestamptz not null default now(),
  check(new_quantity=previous_quantity+delta)
);
create table public.v25_store_settings (
  id boolean primary key default true check(id),
  standard_delivery_rappen integer check(standard_delivery_rappen between 0 and 1000000),
  free_delivery_threshold_rappen integer not null default 10000 check(free_delivery_threshold_rappen=10000),
  adult_delivery_rappen integer check(adult_delivery_rappen between 0 and 1000000),
  tax_configuration_confirmed boolean not null default false,
  vat_registered boolean not null default false, vat_number text not null default '',
  vat_bps integer check(vat_bps between 0 and 10000), prices_include_vat boolean not null default true check(prices_include_vat),
  contact_name text not null default '', contact_address text not null default '', contact_phone text not null default '', support_email text not null default '',
  store_available boolean not null default false, maintenance_mode boolean not null default false,
  payment_enabled boolean not null default false, tobacco_checkout_enabled boolean not null default false,
  payment_provider_reference text not null default '', legal_review_reference text not null default '',
  age_verification_reference text not null default '', adult_delivery_reference text not null default '',
  bundle_discount_bps integer not null default 0 check(bundle_discount_bps between 0 and 10000), revision integer not null default 1,
  check(not payment_enabled or (tax_configuration_confirmed and length(trim(payment_provider_reference))>0)),
  check(not tobacco_checkout_enabled or (payment_enabled and length(trim(legal_review_reference))>0 and length(trim(age_verification_reference))>0 and length(trim(adult_delivery_reference))>0 and adult_delivery_rappen is not null)),
  check(not vat_registered or (length(trim(vat_number))>0 and vat_bps is not null))
);
insert into public.v25_store_settings(id) values(true);
create table public.v25_audit_events (
  id bigint generated always as identity primary key, actor uuid, action text not null, entity text not null,
  entity_id text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on public.v25_products(status,published_at);
create index on public.v25_orders(created_at desc);
create index on public.v25_orders(status);
create index on public.v25_order_items(order_id);
create index on public.v25_inventory_movements(product_id,created_at desc);
create index on public.v25_audit_events(created_at desc);

-- Revocation is immediate: disabled profiles, banned users and signed-out sessions lose access.
create function v25_private.session_valid() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
    and (u.banned_until is null or u.banned_until < now())
    and (s.not_after is null or s.not_after > now()))
$$;
create function v25_private.has_role(allowed public.v25_role[]) returns boolean language sql stable security definer set search_path='' as $$
  select v25_private.session_valid() and exists(select 1 from public.v25_profiles p where p.id=auth.uid() and p.enabled
    and p.role=any(allowed) and (p.role<>'owner' or auth.jwt()->>'aal'='aal2'))
$$;
create function v25_private.require_role(allowed public.v25_role[]) returns void language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(v25_private.has_role(allowed),false) then raise exception 'Not authorized' using errcode='42501'; end if;
end $$;
create function v25_private.audit() returns trigger language plpgsql security definer set search_path='' as $$
declare old_j jsonb:=coalesce(to_jsonb(old),'{}'); new_j jsonb:=coalesce(to_jsonb(new),'{}'); changes jsonb;
begin
  select coalesce(jsonb_agg(key),'[]') into changes from jsonb_each(new_j||old_j) where old_j->key is distinct from new_j->key;
  insert into public.v25_audit_events(actor,action,entity,entity_id,detail)
  values(auth.uid(),tg_op,tg_table_name,coalesce(new_j->>'id',old_j->>'id',new_j->>'product_id',old_j->>'product_id'),
    jsonb_build_object('changed_fields',changes,'status_before',old_j->>'status','status_after',new_j->>'status'));
  return coalesce(new,old);
end $$;
-- No row contents or customer PII are copied into audit events.
do $$ declare t text; begin
  foreach t in array array['profiles','products','product_translations','product_images','inventory','inventory_movements','customers','addresses','orders','order_items','cigar_bundle_items','store_settings','audit_events'] loop
    execute format('alter table public.v25_%I enable row level security',t);
    execute format('revoke all on public.v25_%I from anon, authenticated',t);
    execute format('grant select on public.v25_%I to authenticated',t);
    if t <> 'audit_events' then execute format('create trigger v25_audit after insert or update or delete on public.v25_%I for each row execute function v25_private.audit()',t); end if;
  end loop;
end $$;
create policy profile_self on public.v25_profiles for select to authenticated using(id=auth.uid() and v25_private.session_valid());
create policy profile_owner on public.v25_profiles for select to authenticated using(v25_private.has_role(array['owner']::public.v25_role[]));
do $$ declare t text; begin
  foreach t in array array['products','product_translations','product_images','inventory','inventory_movements'] loop
    execute format('create policy product_staff_read on public.v25_%I for select to authenticated using(v25_private.has_role(array[''owner'',''administrator'',''product_editor'']::public.v25_role[]))',t);
  end loop;
  foreach t in array array['customers','addresses','orders','order_items','cigar_bundle_items'] loop
    execute format('create policy order_staff_read on public.v25_%I for select to authenticated using(v25_private.has_role(array[''owner'',''administrator'',''order_manager'']::public.v25_role[]))',t);
  end loop;
end $$;
create policy settings_staff_read on public.v25_store_settings for select to authenticated using(v25_private.has_role(array['owner','administrator']::public.v25_role[]));
create policy audit_staff_read on public.v25_audit_events for select to authenticated using(v25_private.has_role(array['owner','administrator']::public.v25_role[]));
grant usage on schema v25_private to authenticated;
revoke all on all functions in schema v25_private from public,anon,authenticated;
grant execute on function v25_private.has_role(public.v25_role[]), v25_private.session_valid() to authenticated;
-- No direct DML is granted to any browser role. Mutations go through validated RPCs.
