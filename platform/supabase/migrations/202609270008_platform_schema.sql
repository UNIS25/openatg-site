-- Additive staging platform. Original administration migrations remain intact.
-- Legacy tobacco transactions are inaccessible in this application.
revoke execute on function public.v25_quote(jsonb,boolean), public.v25_create_order(jsonb), public.v25_payment_event(uuid,text,text,text,integer,text), public.v25_update_order(uuid,public.v25_order_status,text,text,integer,boolean) from public,anon,authenticated,service_role;

create table public.v25_members (
 id uuid primary key references auth.users(id), name text not null check(length(trim(name)) between 1 and 120),
 locale text not null default 'de' check(locale in ('de','fr','en')),
 state text not null default 'active' check(state in ('active','suspended','deletion_requested','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.v25_member_addresses (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 label text not null default 'Home' check(length(label)<=80), name text not null check(length(name) between 1 and 120),
 street text not null check(length(street) between 1 and 100), house_number text not null check(length(house_number) between 1 and 20),
 postal_code text not null check(postal_code ~ '^[1-9][0-9]{3}$'), city text not null check(length(city) between 1 and 100), country text not null default 'CH' check(country='CH'),
 created_at timestamptz not null default now()
);
create table public.v25_staff_roles (
 member_id uuid primary key references public.v25_members(id), role text not null check(role in ('staff','manager')),
 enabled boolean not null default true, assigned_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.v25_member_verifications (
 member_id uuid primary key references public.v25_members(id), provider_reference text unique,
 status text not null default 'pending' check(status in ('pending','verified','rejected','expired','manual_review')),
 verified_at timestamptz, expires_at timestamptz, is_test boolean not null default false,
 updated_at timestamptz not null default now(),
 check(status<>'verified' or (provider_reference is not null and verified_at is not null and expires_at>verified_at))
);
create table public.v25_membership_plans (
 id text primary key check(id in ('silver','gold-monthly','gold-yearly')), tier text not null check(tier in ('silver','gold')),
 interval_months integer not null check(interval_months in (0,1,12)), fee_rappen integer not null check(fee_rappen between 0 and 1000000),
 discount_bps integer not null check(discount_bps between 0 and 10000), delivery_rappen integer not null check(delivery_rappen between 0 and 100000),
 free_delivery_threshold_rappen integer not null default 10000 check(free_delivery_threshold_rappen=10000),
 free_swiss_delivery boolean not null default false, drink_benefit boolean not null default false, enabled boolean not null default true,
 revision integer not null default 1,
 check((tier='silver' and fee_rappen=0 and interval_months=0 and discount_bps=0) or (tier='gold' and fee_rappen>0 and interval_months>0))
);
insert into public.v25_membership_plans values
 ('silver','silver',0,0,0,1000,10000,false,false,true,1),
 ('gold-monthly','gold',1,6900,1000,0,10000,true,true,true,1),
 ('gold-yearly','gold',12,50000,1000,0,10000,true,true,true,1);
create table public.v25_memberships (
 id uuid primary key default gen_random_uuid(), member_id uuid not null unique references public.v25_members(id),
 plan_id text not null references public.v25_membership_plans(id), status text not null default 'awaiting_verification'
 check(status in ('awaiting_verification','awaiting_payment','active','past_due','cancelled','expired','suspended')),
 period_start timestamptz, period_end timestamptz, cancel_at_period_end boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(period_end is null or period_end>period_start)
);
create table public.v25_membership_events (
 id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.v25_memberships(id),
 event text not null, actor uuid references auth.users(id), snapshot jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.v25_member_passes (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null,
 revoked_at timestamptz, created_at timestamptz not null default now(), check(expires_at>created_at and expires_at<=created_at+interval '6 minutes')
);
create table public.v25_benefit_definitions (
 id text primary key, names jsonb not null, enabled boolean not null default true,
 minimum_visit_gap_minutes integer not null default 120 check(minimum_visit_gap_minutes between 30 and 1440),
 per_visit_limit integer not null default 1 check(per_visit_limit=1), revision integer not null default 1
);
insert into public.v25_benefit_definitions(id,names) values('drink','{"de":"Ein berechtigtes Getränk pro bestätigtem Besuch","fr":"Une boisson admissible par visite confirmée","en":"One eligible drink per verified visit"}');
create table public.v25_venues (id text primary key, name text not null, enabled boolean not null default true);
insert into public.v25_venues values('restaurant','Varathans25 Restaurant',true),('lounge','Varathans25 Lounge',true);
create table public.v25_visits (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 venue_id text not null references public.v25_venues(id), checked_by uuid not null references auth.users(id),
 opened_at timestamptz not null default now(), closed_at timestamptz
);
create unique index v25_one_open_visit on public.v25_visits(member_id,venue_id) where closed_at is null;
create table public.v25_benefit_redemptions (
 id uuid primary key default gen_random_uuid(), visit_id uuid not null references public.v25_visits(id),
 member_id uuid not null references public.v25_members(id), benefit_id text not null references public.v25_benefit_definitions(id),
 staff_id uuid not null references auth.users(id), venue_id text not null references public.v25_venues(id),
 created_at timestamptz not null default now(), unique(visit_id,benefit_id)
);
create table public.v25_product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.v25_products(id),
 label text not null check(length(label) between 1 and 80), sku text unique, enabled boolean not null default false
);
-- Only an explicitly approved public presentation is visible; draft legal fields,
-- provisional stock, supplier details and unconfirmed prices stay private.
create table public.v25_product_presentations (
 product_id uuid primary key references public.v25_products(id), enabled boolean not null default true,
 gold_eligible boolean not null default true, test_price_rappen integer check(test_price_rappen between 0 and 1000000)
);
create table public.v25_carts (
 id uuid primary key default gen_random_uuid(), member_id uuid not null unique references public.v25_members(id),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.v25_cart_items (
 cart_id uuid not null references public.v25_carts(id) on delete cascade, product_id uuid not null references public.v25_products(id),
 quantity integer not null check(quantity between 1 and 20), primary key(cart_id,product_id)
);
alter table public.v25_customers add column member_id uuid unique references public.v25_members(id);
alter table public.v25_orders add column member_id uuid references public.v25_members(id),
 add column calculation jsonb not null default '{}', add column address_snapshot jsonb not null default '{}',
 add column is_test boolean not null default false,
 add column adult_delivery_state text not null default 'not_applicable' check(adult_delivery_state in ('not_applicable','unconfigured','pending','verified','rejected'));
create table public.v25_payments (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 order_id uuid unique references public.v25_orders(id), membership_id uuid references public.v25_memberships(id),
 reference text not null unique check(reference ~ '^RF[0-9]{2}[A-Z0-9]{1,21}$'),
 amount_rappen integer not null check(amount_rappen between 1 and 100000000), currency text not null default 'CHF' check(currency='CHF'),
 state text not null default 'awaiting_payment' check(state in ('awaiting_payment','processing','paid','matched','failed','expired','cancelled','refunded','partially_refunded')),
 provider text not null default 'test-qr', is_test boolean not null default true,
 fee_snapshot jsonb not null default '{}', refunded_rappen integer not null default 0 check(refunded_rappen>=0),
 expires_at timestamptz not null default now()+interval '7 days', created_at timestamptz not null default now(),
 check((order_id is not null)::int+(membership_id is not null)::int=1), check(refunded_rappen<=amount_rappen)
);
create table public.v25_platform_payment_events (
 id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.v25_payments(id),
 provider text not null, external_id text not null, body_hash text not null,
 state text not null, amount_rappen integer not null, actor uuid references auth.users(id),
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(provider,external_id)
);
create table public.v25_reconciliation_imports (
 id uuid primary key default gen_random_uuid(), actor uuid not null references auth.users(id),
 fingerprint text not null unique, rows_total integer not null check(rows_total between 1 and 500),
 result jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.v25_delivery_methods (
 id text primary key, enabled boolean not null default false, country text not null default 'CH' check(country='CH'),
 standard_rappen integer not null default 1000 check(standard_rappen between 0 and 100000),
 threshold_rappen integer not null default 10000 check(threshold_rappen=10000), adult_approved boolean not null default false check(not adult_approved)
);
insert into public.v25_delivery_methods(id,enabled) values('standard-ch',true);
create table public.v25_consent_records (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 purpose text not null check(purpose in ('terms','privacy','hospitality_messages')), granted boolean not null,
 policy_version text not null check(length(policy_version) between 1 and 40), created_at timestamptz not null default now()
);
create table public.v25_privacy_requests (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.v25_members(id),
 kind text not null check(kind in ('export','deletion')), state text not null default 'requested' check(state in ('requested','reviewing','completed')),
 created_at timestamptz not null default now()
);
create table public.v25_platform_settings (
 id boolean primary key default true check(id), maintenance_mode boolean not null default false,
 session_minutes integer not null default 480 check(session_minutes between 15 and 480),
 verification_retention_days integer not null default 30 check(verification_retention_days between 1 and 365),
 revision integer not null default 1
);
insert into public.v25_platform_settings(id) values(true);
create table v25_private.platform_runtime (id boolean primary key default true check(id), local_test boolean not null default false, production_writes boolean not null default false);
insert into v25_private.platform_runtime(id) values(true);
create table v25_private.platform_idempotency (
 actor uuid not null, scope text not null, key uuid not null, request_hash text not null,
 response jsonb not null, created_at timestamptz not null default now(), primary key(actor,scope,key)
);
create table v25_private.platform_rate_limits (key text not null, bucket bigint not null, count integer not null, primary key(key,bucket));

create function v25_private.platform_member() returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.session_valid() and exists(select 1 from public.v25_members m join auth.users u on u.id=m.id where m.id=auth.uid() and m.state='active' and u.email_confirmed_at is not null)
$$;
create function v25_private.platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.has_role(array['owner','administrator']::public.v25_role[])
$$;
create function v25_private.platform_staff() returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.platform_member() and (v25_private.platform_admin() or exists(select 1 from public.v25_staff_roles where member_id=auth.uid() and enabled))
$$;
create function v25_private.platform_verified(member uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.v25_member_verifications a join public.v25_members m on m.id=a.member_id
 where a.member_id=member and m.state='active' and a.status='verified' and a.expires_at>now()
 and (not a.is_test or (select local_test from v25_private.platform_runtime where id)))
$$;
create function v25_private.platform_gold(member uuid) returns boolean language sql stable security definer set search_path='' as $$
 select v25_private.platform_verified(member) and exists(select 1 from public.v25_memberships m join public.v25_membership_plans p on p.id=m.plan_id
 where m.member_id=member and p.tier='gold' and p.enabled and m.status='active' and m.period_start<=now() and m.period_end>now())
$$;
create function v25_private.immutable_event() returns trigger language plpgsql set search_path='' as $$
 begin raise exception 'Immutable event history' using errcode='42501'; end $$;

-- Deny by default on every exposed table. No browser DML; writes are typed RPCs.
do $$ declare t text; begin
 foreach t in array array['members','member_addresses','staff_roles','member_verifications','membership_plans','memberships','membership_events','member_passes','benefit_definitions','venues','visits','benefit_redemptions','product_variants','product_presentations','carts','cart_items','payments','platform_payment_events','reconciliation_imports','delivery_methods','consent_records','privacy_requests','platform_settings'] loop
  execute format('alter table public.v25_%I enable row level security',t);
  execute format('revoke all on public.v25_%I from public,anon,authenticated',t);
  execute format('grant select on public.v25_%I to authenticated',t);
  execute format('create policy administrator_read on public.v25_%I for select to authenticated using(v25_private.platform_admin())',t);
  execute format('create trigger platform_audit after insert or update or delete on public.v25_%I for each row execute function v25_private.audit()',t);
 end loop;
 foreach t in array array['membership_events','platform_payment_events','benefit_redemptions','consent_records','audit_events'] loop
  execute format('create trigger immutable_history before update or delete on public.v25_%I for each row execute function v25_private.immutable_event()',t);
 end loop;
end $$;
create policy member_self on public.v25_members for select to authenticated using(id=auth.uid() and v25_private.session_valid());
do $$ declare t text; begin
 foreach t in array array['member_addresses','staff_roles','member_verifications','memberships','member_passes','carts','payments','benefit_redemptions','consent_records','privacy_requests'] loop
  execute format('create policy own_rows on public.v25_%I for select to authenticated using(member_id=auth.uid() and v25_private.platform_member())',t);
 end loop;
end $$;
create policy own_cart_items on public.v25_cart_items for select to authenticated using(exists(select 1 from public.v25_carts c where c.id=cart_id and c.member_id=auth.uid()) and v25_private.platform_member());
create policy own_membership_events on public.v25_membership_events for select to authenticated using(exists(select 1 from public.v25_memberships m where m.id=membership_id and m.member_id=auth.uid()) and v25_private.platform_member());
create policy own_payment_events on public.v25_platform_payment_events for select to authenticated using(exists(select 1 from public.v25_payments p where p.id=payment_id and p.member_id=auth.uid()) and v25_private.platform_member());
create policy own_orders on public.v25_orders for select to authenticated using(member_id=auth.uid() and v25_private.platform_member());
create policy own_order_items on public.v25_order_items for select to authenticated using(exists(select 1 from public.v25_orders o where o.id=order_id and o.member_id=auth.uid()) and v25_private.platform_member());
create policy plans_read on public.v25_membership_plans for select to anon,authenticated using(enabled);
create policy benefits_read on public.v25_benefit_definitions for select to anon,authenticated using(enabled);
create policy venue_read on public.v25_venues for select to authenticated using(enabled);
grant select on public.v25_membership_plans,public.v25_benefit_definitions to anon;
revoke all on all functions in schema v25_private from public,anon,authenticated;
grant usage on schema v25_private to authenticated;
grant execute on function v25_private.has_role(public.v25_role[]),v25_private.session_valid(),v25_private.platform_member(),v25_private.platform_admin(),v25_private.platform_staff(),v25_private.platform_verified(uuid),v25_private.platform_gold(uuid),v25_private.image_is_public(text) to authenticated;
-- Anon storage policy calls the original read-only image predicate.
grant execute on function v25_private.image_is_public(text) to anon;
create index on public.v25_member_addresses(member_id);
create index on public.v25_orders(member_id,created_at desc);
create index on public.v25_membership_events(membership_id,created_at desc);
create index on public.v25_payments(member_id,created_at desc);
create index on public.v25_platform_payment_events(payment_id,created_at desc);
create index on public.v25_visits(member_id,venue_id,opened_at desc);
