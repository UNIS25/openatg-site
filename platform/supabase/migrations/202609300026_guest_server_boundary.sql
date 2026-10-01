-- Guest writes must pass the server CSRF, input validation and rate limit boundary.
-- Never expose the order creation RPC to browser or anonymous Supabase clients.
revoke all on function public.v25_guest_create_order(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.v25_guest_create_order(jsonb,uuid) to service_role;
notify pgrst, 'reload schema';
