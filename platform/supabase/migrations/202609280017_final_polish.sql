-- Additive local refinement. No account, product or media resets.
create table public.v25_polish_settings (
 id text primary key check(id='experience'), document jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
alter table public.v25_polish_settings enable row level security;
revoke all on public.v25_polish_settings from public, anon, authenticated;
create trigger staging_write_guard before insert or update or delete on public.v25_polish_settings for each row execute function v25_private.platform_write_guard();
create trigger platform_audit after insert or update or delete on public.v25_polish_settings for each row execute function v25_private.audit();
insert into public.v25_polish_settings(id,document) values('experience',$copy${"spice_film": "kitchen", "restaurant_image": "bar-evening", "restaurant_url": "https://www.varathans25.ch/", "copy": {"de": {"spiceTitle": "Zeit für Geschmack.", "spiceText": "Ein Blick auf die Zubereitung.", "restaurantTitle": "Ein Ort, an den man zurückkehrt.", "restaurantText": "Varathans25. Besuchen Sie unser Restaurant in der Schweiz.", "restaurantCta": "Zum Restaurant", "restaurantAlt": "Die Bar im Varathans25 Restaurant mit dunklen Sitzmöbeln und warmem Licht", "terms": "Staging-Konditionen · Vorbehaltlich der abschliessenden Bestätigung durch Inhaber und Rechtsberatung. Mitgliedschaftszahlungen sind hier nur Tests.", "silverPosition": "Ihr persönliches Mitgliedskonto.", "silverRecurring": "Keine wiederkehrende Mitgliedschaftsgebühr", "silverDelivery": "{delivery} Standardlieferung in der Schweiz", "silverThreshold": "Kostenlose Lieferung ab {threshold}", "silverProfile": "Mitgliederprofil und Konto", "silverPreferences": "Gespeicherte Kontoeinstellungen", "silverCta": "Silver auswählen", "goldPosition": "Zusätzliche Leistungen für Ihren Alltag.", "goldDelivery": "Kostenlose berechtigte Lieferung in der Schweiz", "goldDiscount": "{discount}% Rabatt auf berechtigte Varathans25 Produkte", "goldDrink": "Ein kostenloses Getränk pro bestätigtem Restaurant- oder Lounge-Besuch", "goldPass": "Digitaler Gold-Mitgliedsausweis", "goldBenefits": "Zugang zu berechtigten Gold-Leistungen", "goldCta": "Gold-Optionen ansehen"}, "fr": {"spiceTitle": "Le temps des saveurs.", "spiceText": "Un regard sur la préparation.", "restaurantTitle": "Un lieu où revenir.", "restaurantText": "Varathans25. Retrouvez notre restaurant en Suisse.", "restaurantCta": "Découvrir le restaurant", "restaurantAlt": "Le bar du restaurant Varathans25, ses sièges sombres et sa lumière chaleureuse", "terms": "Conditions de staging · Sous réserve de validation finale par le propriétaire et le conseil juridique. Les paiements d’adhésion sont uniquement des tests.", "silverPosition": "Votre compte membre personnel.", "silverRecurring": "Aucuns frais d’adhésion récurrents", "silverDelivery": "Livraison standard en Suisse : {delivery}", "silverThreshold": "Livraison offerte dès {threshold}", "silverProfile": "Profil membre et compte", "silverPreferences": "Préférences du compte enregistrées", "silverCta": "Choisir Silver", "goldPosition": "Des prestations supplémentaires au quotidien.", "goldDelivery": "Livraison éligible offerte en Suisse", "goldDiscount": "{discount}% de remise sur les produits Varathans25 éligibles", "goldDrink": "Une boisson offerte par visite vérifiée au restaurant ou au lounge", "goldPass": "Carte de membre Gold numérique", "goldBenefits": "Accès aux prestations Gold éligibles", "goldCta": "Voir les options Gold"}, "en": {"spiceTitle": "Time for flavour.", "spiceText": "A study in preparation.", "restaurantTitle": "A place to return to.", "restaurantText": "Varathans25. Visit our restaurant in Switzerland.", "restaurantCta": "Visit the restaurant", "restaurantAlt": "The Varathans25 restaurant bar with dark seating and warm pendant lights", "terms": "Staging terms · Pending final owner and legal confirmation. Membership payments here are tests only.", "silverPosition": "Your personal member account.", "silverRecurring": "No recurring membership charge", "silverDelivery": "{delivery} standard Swiss delivery", "silverThreshold": "Free delivery from {threshold}", "silverProfile": "Member profile and account", "silverPreferences": "Saved account preferences", "silverCta": "Choose Silver", "goldPosition": "Additional benefits for everyday use.", "goldDelivery": "Free eligible Swiss delivery", "goldDiscount": "{discount}% discount on eligible Varathans25 products", "goldDrink": "One complimentary drink per verified restaurant or lounge visit", "goldPass": "Digital Gold member pass", "goldBenefits": "Access to eligible Gold benefits", "goldCta": "View Gold options"}}}$copy$::jsonb);
create function public.v25_polish_public() returns jsonb language sql stable security definer set search_path='' as $$
 select document || jsonb_build_object('revision',revision) from public.v25_polish_settings where id='experience'
$$;
revoke all on function public.v25_polish_public() from public;
grant execute on function public.v25_polish_public() to anon,authenticated;
create function public.v25_polish_save(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare loc record; field record;
begin
 perform v25_private.local_write();
 if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>40000 then raise exception 'Invalid configuration'; end if;
 if (select count(*) from jsonb_object_keys(input))<>5 or exists(select 1 from jsonb_object_keys(input) k where k not in ('revision','spice_film','restaurant_image','restaurant_url','copy')) then raise exception 'Invalid fields'; end if;
 if coalesce(input->>'spice_film','') not in ('kitchen','poster-only') or input->>'restaurant_image' is distinct from 'bar-evening' then raise exception 'Unapproved media'; end if;
 if coalesce(input->>'restaurant_url','') !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$' or length(input->>'restaurant_url')>300 then raise exception 'HTTPS URL required'; end if;
 if jsonb_typeof(input->'copy') is distinct from 'object' or (select count(*) from jsonb_object_keys(input->'copy'))<>3 then raise exception 'Three languages required'; end if;
 for loc in select * from jsonb_each(input->'copy') loop
  if loc.key not in ('de','fr','en') or jsonb_typeof(loc.value) is distinct from 'object' then raise exception 'Invalid locale'; end if;
  if (select count(*) from jsonb_object_keys(loc.value))<>21 then raise exception 'Complete translations required'; end if;
  for field in select * from jsonb_each(loc.value) loop
   if field.key not in ('spiceTitle','spiceText','restaurantTitle','restaurantText','restaurantCta','restaurantAlt','terms','silverPosition','silverRecurring','silverDelivery','silverThreshold','silverProfile','silverPreferences','silverCta','goldPosition','goldDelivery','goldDiscount','goldDrink','goldPass','goldBenefits','goldCta') or jsonb_typeof(field.value) is distinct from 'string' or length(trim(field.value #>> '{}')) not between 1 and 500 then raise exception 'Invalid translation'; end if;
  end loop;
 end loop;
 update public.v25_polish_settings set document=input-'revision',revision=revision+1,updated_at=now() where id='experience' and revision=(input->>'revision')::integer;
 if not found then raise exception 'Revision conflict'; end if;
 return public.v25_polish_public();
end $$;
revoke all on function public.v25_polish_save(jsonb) from public,anon;
grant execute on function public.v25_polish_save(jsonb) to authenticated;

-- Keep Silver free with no recurring fee. Gold pricing remains editable.
-- Delivery threshold is now configurable; the default stays CHF 100.00.
alter table public.v25_delivery_methods drop constraint v25_delivery_methods_threshold_rappen_check;
alter table public.v25_delivery_methods add constraint v25_delivery_methods_threshold_rappen_check check(threshold_rappen between 0 and 1000000);
alter table public.v25_delivery_methods add column revision integer not null default 1;
alter table public.v25_membership_plans drop constraint v25_membership_plans_free_delivery_threshold_rappen_check;
alter table public.v25_membership_plans add constraint v25_membership_plans_free_delivery_threshold_rappen_check check(free_delivery_threshold_rappen between 0 and 1000000);
create or replace function v25_private.platform_quote(lines jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare row record; item record; entries jsonb:='[]'; sub integer:=0; dis integer:=0; delivery integer; bps integer:=0; gold boolean:=v25_private.platform_gold(auth.uid()); unit integer; d integer; q integer;
begin
 if jsonb_typeof(lines) is distinct from 'array' or coalesce(jsonb_array_length(lines),0) not between 1 and 30 then raise exception 'Invalid cart'; end if;
 if gold then select p.discount_bps into bps from public.v25_memberships m join public.v25_membership_plans p on p.id=m.plan_id where m.member_id=auth.uid(); end if;
 for item in select (x->>'product_id')::uuid id,sum((x->>'quantity')::integer)::integer qty from jsonb_array_elements(lines) x group by 1 order by 1 loop
  q:=item.qty; if q is null or q not between 1 and 20 then raise exception 'Invalid quantity'; end if;
  select p.*,s.gold_eligible,s.test_price_rappen,s.enabled,i.quantity into row from public.v25_products p join public.v25_product_presentations s on s.product_id=p.id join public.v25_inventory i on i.product_id=p.id where p.id=item.id for update of i;
  if not found or row.adult_only or not row.enabled or row.status='archived' or row.category not in ('tea','pantry') then raise exception 'Product unavailable' using errcode='42501'; end if;
  unit:=case when row.status='active' and row.price_confirmed then row.price_rappen when (select local_test from v25_private.platform_runtime where id) then row.test_price_rappen end;
  if unit is null or unit<=0 or row.quantity<q then raise exception 'Price or stock unavailable'; end if;
  d:=greatest(case when row.gold_eligible then ((unit::bigint*q*bps+5000)/10000)::integer else 0 end,
   case when row.price_confirmed and row.promotion_rappen is not null then (unit-row.promotion_rappen)*q else 0 end);
  sub:=sub+unit*q; dis:=dis+d;
  entries:=entries||jsonb_build_array(jsonb_build_object('product_id',item.id,'quantity',q,'unit_rappen',unit,'discount_rappen',d,'gold_eligible',row.gold_eligible,'gold_bps',bps,'promotion_unit_rappen',case when row.price_confirmed then row.promotion_rappen end,'discount_source',case when d=0 then 'none' when row.price_confirmed and row.promotion_rappen is not null and (unit-row.promotion_rappen)*q>=d then 'promotion' else 'gold_membership' end,'product_revision',row.revision));
 end loop;
 select case when gold or sub-dis>=threshold_rappen then 0 else standard_rappen end into delivery from public.v25_delivery_methods where id='standard-ch' and enabled;
 if delivery is null then raise exception 'Delivery unavailable'; end if;
 return jsonb_build_object('lines',entries,'subtotal_rappen',sub,'discount_rappen',dis,'delivery_rappen',delivery,'total_rappen',sub-dis+delivery,'remaining_rappen',greatest(0,(select threshold_rappen from public.v25_delivery_methods where id='standard-ch')-(sub-dis)),'gold',gold,'currency','CHF','is_test',true,'rules_version','2026-09-27','rounding','half-up-per-line','plan_id',(select plan_id from public.v25_memberships where member_id=auth.uid()),'delivery_configuration',(select jsonb_build_object('country',country,'standard_rappen',standard_rappen,'threshold_rappen',threshold_rappen) from public.v25_delivery_methods where id='standard-ch'));
end $$;

create or replace function public.v25_platform_action(action text, document jsonb default '{}', request_key uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb:='{}'; previous record; request_fingerprint text:=md5(document::text); m public.v25_memberships; plan public.v25_membership_plans; address public.v25_member_addresses; p public.v25_payments; pass public.v25_member_passes; visit public.v25_visits; benefit public.v25_benefit_definitions; row record; quote jsonb; c uuid; a uuid; oid uuid; payment uuid; mem uuid; n integer; current_status public.v25_order_status;
begin
 perform v25_private.local_write();
 if not v25_private.session_valid() then raise exception 'Authentication required' using errcode='42501'; end if;
 if action<>'onboard' and not v25_private.platform_member() then raise exception 'Active member required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||action||request_key::text,0));
 select * into previous from v25_private.platform_idempotency where actor=uid and scope=action and key=request_key;
 if found then if previous.request_hash<>request_fingerprint then raise exception 'Idempotency conflict'; end if; return previous.response; end if;
 case action
 when 'onboard' then
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) or document->>'consent' is distinct from 'true' then raise exception 'Verified email and consent required'; end if;
  insert into public.v25_members(id,name,locale) values(uid,document->>'name',coalesce(document->>'locale','de')) on conflict(id) do nothing;
  insert into public.v25_memberships(member_id,plan_id) values(uid,'silver') on conflict(member_id) do nothing;
  insert into public.v25_member_verifications(member_id) values(uid) on conflict do nothing;
  insert into public.v25_consent_records(member_id,purpose,granted,policy_version) values(uid,'terms',true,'local-review-v1'),(uid,'privacy',true,'local-review-v1');
 when 'profile' then update public.v25_members set name=document->>'name',locale=document->>'locale',updated_at=now() where id=uid;
 when 'address' then
  insert into public.v25_member_addresses(member_id,label,name,street,house_number,postal_code,city) values(uid,coalesce(document->>'label','Home'),document->>'name',document->>'street',document->>'house_number',document->>'postal_code',document->>'city') returning to_jsonb(v25_member_addresses.*) into result;
 when 'address_remove' then delete from public.v25_member_addresses where id=(document->>'id')::uuid and member_id=uid;
 when 'privacy' then
  insert into public.v25_privacy_requests(member_id,kind) values(uid,document->>'kind');
  if document->>'kind'='deletion' then update public.v25_members set state='deletion_requested' where id=uid; end if;
 when 'consent' then insert into public.v25_consent_records(member_id,purpose,granted,policy_version) values(uid,'hospitality_messages',(document->>'granted')::boolean,'local-review-v1');
 when 'test_verification' then
  if document->>'status' not in ('pending','verified','rejected','expired','manual_review') then raise exception 'Invalid verification'; end if;
  insert into public.v25_member_verifications(member_id,provider_reference,status,verified_at,expires_at,is_test) values(uid,'local-test-'||uid,document->>'status',now(),case when document->>'status'='expired' then now()-interval '1 second' else now()+interval '365 days' end,true)
   on conflict(member_id) do update set status=excluded.status,provider_reference=excluded.provider_reference,verified_at=excluded.verified_at,expires_at=excluded.expires_at,is_test=true,updated_at=now();
  if document->>'status'='verified' then update public.v25_memberships set status='active',period_start=now() where member_id=uid and plan_id='silver'; end if;
 when 'membership' then
  if not v25_private.platform_verified(uid) then raise exception 'Adult verification required' using errcode='42501'; end if;
  select * into plan from public.v25_membership_plans where id=document->>'plan_id' and enabled;
  if not found then raise exception 'Unknown plan'; end if;
  select * into m from public.v25_memberships where member_id=uid for update;
  if plan.tier='silver' then
   if v25_private.platform_gold(uid) then update public.v25_memberships set cancel_at_period_end=true where id=m.id;
   else update public.v25_memberships set plan_id=plan.id,status='active',period_start=now(),period_end=null where id=m.id; end if;
  else
   if v25_private.platform_gold(uid) then raise exception 'Paid period still active'; end if;
   if exists(select 1 from public.v25_payments where membership_id=m.id and state in ('awaiting_payment','processing') and expires_at>now()) then raise exception 'Payment already pending'; end if;
   payment:=gen_random_uuid();
   insert into public.v25_payments(id,member_id,membership_id,reference,amount_rappen,fee_snapshot) values(payment,uid,m.id,v25_private.rf_reference(payment),plan.fee_rappen,jsonb_build_object('plan_id',plan.id,'fee_rappen',plan.fee_rappen,'interval_months',plan.interval_months));
   update public.v25_memberships set status='awaiting_payment',plan_id=plan.id where id=m.id;
   result:=jsonb_build_object('payment_id',payment);
  end if;
  insert into public.v25_membership_events(membership_id,event,actor,snapshot) values(m.id,'plan_selected',uid,jsonb_build_object('plan_id',plan.id));
 when 'cancel_membership' then
  update public.v25_memberships set cancel_at_period_end=true where member_id=uid returning * into m;
  insert into public.v25_membership_events(membership_id,event,actor) values(m.id,'cancellation_at_period_end',uid);
 when 'cart' then
  if jsonb_array_length(document->'lines')>30 then raise exception 'Cart limit'; end if;
  if jsonb_array_length(document->'lines')>0 then perform v25_private.platform_quote(document->'lines'); end if;
  insert into public.v25_carts(member_id) values(uid) on conflict(member_id) do update set revision=v25_carts.revision+1,updated_at=now() returning id into c;
  delete from public.v25_cart_items where cart_id=c;
  insert into public.v25_cart_items(cart_id,product_id,quantity) select c,(x->>'product_id')::uuid,sum((x->>'quantity')::int) from jsonb_array_elements(document->'lines') x group by 2;
 when 'quote' then result:=v25_private.platform_quote(document->'lines');
 when 'order' then
  quote:=v25_private.platform_quote(document->'lines');
  select * into address from public.v25_member_addresses where id=(document->>'address_id')::uuid and member_id=uid;
  if not found then raise exception 'Address required'; end if;
  insert into public.v25_customers(member_id,email,name) select uid,u.email,member_row.name from auth.users u join public.v25_members member_row on member_row.id=u.id where u.id=uid on conflict(member_id) do update set name=excluded.name returning id into c;
  insert into public.v25_addresses(customer_id,line1,postal_code,city) values(c,address.street||' '||address.house_number,address.postal_code,address.city) returning id into a;
  insert into public.v25_orders(idempotency_key,request_hash,customer_id,address_id,member_id,locale,subtotal_rappen,discount_rappen,delivery_rappen,adult_delivery_rappen,tax_rappen,total_rappen,calculation,address_snapshot,is_test)
  values(request_key,request_fingerprint,c,a,uid,(select locale from public.v25_members where id=uid),(quote->>'subtotal_rappen')::int,(quote->>'discount_rappen')::int,(quote->>'delivery_rappen')::int,0,0,(quote->>'total_rappen')::int,quote,to_jsonb(address),true) returning id into oid;
  for row in select * from jsonb_to_recordset(quote->'lines') as x(product_id uuid,quantity integer,unit_rappen integer) loop
   insert into public.v25_order_items(order_id,product_id,quantity,name,unit_rappen) values(oid,row.product_id,row.quantity,(select name from public.v25_product_translations where product_id=row.product_id and locale=(select locale from public.v25_members where id=uid)),row.unit_rappen);
   update public.v25_inventory set quantity=quantity-row.quantity where product_id=row.product_id returning quantity into n;
   insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,actor,order_id) values(row.product_id,-row.quantity,n+row.quantity,n,'Local test order',uid,oid);
  end loop;
  payment:=gen_random_uuid(); insert into public.v25_payments(id,member_id,order_id,reference,amount_rappen) values(payment,uid,oid,v25_private.rf_reference(payment),(quote->>'total_rappen')::int);
  delete from public.v25_cart_items where cart_id in(select id from public.v25_carts where member_id=uid);
  result:=jsonb_build_object('order_id',oid,'payment_id',payment,'quote',quote);
 when 'pass' then
  if not v25_private.platform_gold(uid) then raise exception 'Active verified Gold required' using errcode='42501'; end if;
  update public.v25_member_passes set revoked_at=now() where member_id=uid and revoked_at is null;
  insert into public.v25_member_passes(member_id,token_hash,expires_at) values(uid,document->>'token_hash',now()+interval '5 minutes') returning jsonb_build_object('id',id,'expires_at',expires_at) into result;
 when 'pass_check','redeem' then
  if not v25_private.platform_staff() then raise exception 'Staff required' using errcode='42501'; end if;
  select * into pass from public.v25_member_passes where token_hash=document->>'token_hash' and revoked_at is null and expires_at>now();
  if not found or not v25_private.platform_gold(pass.member_id) then raise exception 'Pass invalid or expired'; end if;
  select * into benefit from public.v25_benefit_definitions where id='drink' and enabled;
  if not found or not exists(select 1 from public.v25_venues where id=document->>'venue' and enabled) then raise exception 'Benefit unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(pass.member_id::text||'visit',0));
  select * into visit from public.v25_visits where member_id=pass.member_id and opened_at>now()-make_interval(mins=>benefit.minimum_visit_gap_minutes) order by opened_at desc limit 1;
  result:=jsonb_build_object('name',(select name from public.v25_members where id=pass.member_id),'tier','gold','eligible',not exists(select 1 from public.v25_benefit_redemptions where visit_id=visit.id and benefit_id='drink'));
  if action='redeem' then
   if document->>'identity_confirmed' is distinct from 'true' then raise exception 'Confirm named member presence'; end if;
   if visit.id is null then
    update public.v25_visits set closed_at=now() where member_id=pass.member_id and closed_at is null;
    insert into public.v25_visits(member_id,venue_id,checked_by) values(pass.member_id,document->>'venue',uid) returning * into visit;
   end if;
   insert into public.v25_benefit_redemptions(visit_id,member_id,benefit_id,staff_id,venue_id) values(visit.id,pass.member_id,'drink',uid,document->>'venue') returning jsonb_build_object('id',id,'created_at',created_at) into result;
  end if;
 when 'reconcile' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  result:=v25_private.payment_apply((document->>'payment_id')::uuid,document->>'state',(document->>'amount_rappen')::int,document->>'event_id',md5(document::text),document->>'reason');
 when 'reconcile_import' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if jsonb_typeof(document->'rows')<>'array' or jsonb_array_length(document->'rows') not between 1 and 500 then raise exception 'Invalid bank import'; end if;
  if exists(select 1 from public.v25_reconciliation_imports where fingerprint=md5((document->'rows')::text)) then raise exception 'Duplicate import'; end if;
  result:='[]';
  for row in select value as entry from jsonb_array_elements(document->'rows') loop
   if row.entry->>'currency'<>'CHF' or row.entry->>'transaction_id' !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'Invalid bank entry'; end if;
   select * into p from public.v25_payments where reference=row.entry->>'reference';
   if not found then raise exception 'Unknown reference'; end if;
   result:=result||jsonb_build_array(v25_private.payment_apply(p.id,'matched',(row.entry->>'amount_rappen')::integer,'bank-'||(row.entry->>'transaction_id'),md5(row.entry::text),'Local test bank import'));
  end loop;
  insert into public.v25_reconciliation_imports(actor,fingerprint,rows_total,result) values(uid,md5((document->'rows')::text),jsonb_array_length(document->'rows'),result);
 when 'order_status' then
  perform v25_private.require_role(array['owner','administrator','order_manager']::public.v25_role[]);
  oid:=(document->>'id')::uuid;
  select status into current_status from public.v25_orders where id=oid for update;
  if not ((current_status='paid' and document->>'status'='preparing') or (current_status='preparing' and document->>'status'='dispatched') or (current_status='dispatched' and document->>'status'='completed') or (current_status in ('pending','paid') and document->>'status'='cancelled')) then raise exception 'Invalid order transition'; end if;
  if document->>'status' in ('preparing','dispatched','completed') and not exists(select 1 from public.v25_payments where order_id=oid and state in ('paid','matched')) then raise exception 'Paid order required'; end if;
  if document->>'status'='cancelled' then
   for row in select * from public.v25_order_items where order_id=oid loop
    update public.v25_inventory set quantity=quantity+row.quantity where product_id=row.product_id returning quantity into n;
    insert into public.v25_inventory_movements(product_id,delta,previous_quantity,new_quantity,reason,actor,order_id) values(row.product_id,row.quantity,n-row.quantity,n,'Cancelled local order',uid,oid);
   end loop;
   update public.v25_payments set state='cancelled' where order_id=oid and state in ('awaiting_payment','processing');
  end if;
  update public.v25_orders set status=(document->>'status')::public.v25_order_status,tracking_number=coalesce(document->>'tracking',''),fulfillment_notes=coalesce(document->>'notes',''),revision=revision+1,stock_released=document->>'status'='cancelled' where id=oid;
 when 'member_state' then
  if not v25_private.platform_admin() or (document->>'id')::uuid=uid then raise exception 'Administrator required' using errcode='42501'; end if;
  update public.v25_members set state=document->>'state' where id=(document->>'id')::uuid;
 when 'verification_review' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if document->>'status' not in ('rejected','expired','manual_review') then raise exception 'Provider verification required'; end if;
  update public.v25_member_verifications set status=document->>'status',updated_at=now() where member_id=(document->>'id')::uuid;
 when 'plan_settings' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  update public.v25_membership_plans set fee_rappen=(document->>'fee_rappen')::int,discount_bps=(document->>'discount_bps')::int,revision=revision+1 where id=document->>'id' and revision=(document->>'revision')::int;
  if not found then raise exception 'Revision conflict'; end if;
 when 'benefit_settings' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  update public.v25_benefit_definitions set minimum_visit_gap_minutes=(document->>'minutes')::int,enabled=(document->>'enabled')::boolean,revision=revision+1 where id='drink';
 when 'delivery_settings' then
  if not v25_private.platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  update public.v25_delivery_methods set standard_rappen=(document->>'standard_rappen')::int,threshold_rappen=(document->>'threshold_rappen')::int,revision=revision+1 where id='standard-ch' and revision=(document->>'revision')::int;
  if not found then raise exception 'Revision conflict'; end if;
  update public.v25_membership_plans set free_delivery_threshold_rappen=(document->>'threshold_rappen')::int,delivery_rappen=case when tier='silver' then (document->>'standard_rappen')::int else delivery_rappen end,revision=revision+1 where id in ('silver','gold-monthly','gold-yearly');
 when 'eligibility' then
  perform v25_private.require_role(array['owner','administrator','product_editor']::public.v25_role[]);
  update public.v25_product_presentations set gold_eligible=(document->>'gold_eligible')::boolean where product_id=(document->>'id')::uuid;
 when 'staff' then
  if not v25_private.has_role(array['owner']::public.v25_role[]) then raise exception 'Owner MFA required' using errcode='42501'; end if;
  insert into public.v25_staff_roles(member_id,role,enabled,assigned_by) values((document->>'id')::uuid,document->>'role',(document->>'enabled')::boolean,uid) on conflict(member_id) do update set role=excluded.role,enabled=excluded.enabled,assigned_by=uid;
 else raise exception 'Unknown action';
 end case;
 insert into v25_private.platform_idempotency values(uid,action,request_key,request_fingerprint,result,now());
 return result;
end $$;

notify pgrst, 'reload schema';
