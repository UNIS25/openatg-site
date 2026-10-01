-- Durable notification intent for local test orders. No sender is configured, so no delivery is claimed.
create table public.v25_order_notification_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.v25_orders(id),
 kind text not null check(kind in ('order_received','payment_confirmed')),
 state text not null default 'not_configured' check(state in ('not_configured','queued','sent','failed')),
 recipient text not null check(length(recipient) between 3 and 254),
 provider_reference text,
 created_at timestamptz not null default now(),
 unique(order_id,kind)
);
alter table public.v25_order_notification_events enable row level security;
revoke all on public.v25_order_notification_events from public,anon,authenticated;
grant select on public.v25_order_notification_events to authenticated;
create policy admin_read on public.v25_order_notification_events for select to authenticated using(v25_private.platform_admin());
create trigger immutable_notification_events before update or delete on public.v25_order_notification_events for each row execute function v25_private.immutable_event();

create function v25_private.record_order_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient_address text;
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and old.status='pending' and new.status='paid') then
  select c.email into recipient_address from public.v25_customers c where c.id=new.customer_id;
  if recipient_address is not null then
   insert into public.v25_order_notification_events(order_id,kind,recipient)
   values(new.id,case when tg_op='INSERT' then 'order_received' else 'payment_confirmed' end,recipient_address)
   on conflict(order_id,kind) do nothing;
  end if;
 end if;
 return new;
end $$;
create trigger order_notification_intent after insert or update of status on public.v25_orders for each row execute function v25_private.record_order_notification();
notify pgrst, 'reload schema';
