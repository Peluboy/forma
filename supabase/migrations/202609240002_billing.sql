-- Private, server-managed billing records. Never grant clients mutation access.
create table public.forma_billing (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null check(version > 0),
  customer text unique,
  reference text unique
);
alter table public.forma_billing enable row level security;
revoke all on public.forma_billing from public,anon,authenticated;
grant select,insert,update,delete on public.forma_billing to service_role;

create function public.forma_billing_save(p_owner uuid,p_expected integer,p_data jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare changed integer;
begin
  if p_expected=0 then
    insert into public.forma_billing(owner_id,data,version,customer,reference)
    values(p_owner,p_data,1,p_data->>'customer',p_data->'checkout'->>'reference')
    on conflict(owner_id) do nothing;
  else
    update public.forma_billing set data=p_data,version=version+1,
      customer=p_data->>'customer',reference=p_data->'checkout'->>'reference'
    where owner_id=p_owner and version=p_expected;
  end if;
  get diagnostics changed=row_count;
  return changed=1;
end $$;
revoke all on function public.forma_billing_save(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.forma_billing_save(uuid,integer,jsonb) to service_role;
