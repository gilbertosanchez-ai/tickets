create table public.ticket_checkout_fulfillments (
  session_id text primary key,
  user_id uuid not null,
  boletos integer not null check (boletos > 0)
);

alter table public.ticket_checkout_fulfillments enable row level security;
revoke all on public.ticket_checkout_fulfillments from anon, authenticated;
grant select, insert on public.ticket_checkout_fulfillments to service_role;

create function public.fulfill_ticket_checkout(p_session_id text, p_user_id uuid, p_boletos integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.ticket_checkout_fulfillments (session_id, user_id, boletos)
  values (p_session_id, p_user_id, p_boletos)
  on conflict (session_id) do nothing;
  if not found then return; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  update public.credits set boletos = boletos + p_boletos where user_id = p_user_id;
  if not found then
    insert into public.credits (user_id, boletos) values (p_user_id, p_boletos);
  end if;
end;
$$;

revoke all on function public.fulfill_ticket_checkout(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.fulfill_ticket_checkout(text, uuid, integer) to service_role;
