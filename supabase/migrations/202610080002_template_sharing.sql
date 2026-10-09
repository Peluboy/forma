-- Template Distribution, Sharing & Forking v1 (Phase 6).
-- `forma_records` is owner-scoped with RLS, so cross-owner reads of a shared
-- or public template require SECURITY DEFINER functions (the pattern used by
-- forma_review). These functions expose only templates that are explicitly
-- approved, shared, gallery-listed, and not revoked — never private records.
begin;

-- Resolve an unlisted/public template by its share token or public id.
create or replace function public.forma_template_shared(p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare row public.forma_records;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'NOT_FOUND'; end if;
  select * into row from public.forma_records
    where kind = 'template_family'
      and (data->'sharing'->>'shareToken' = p_token
           or data->'sharing'->>'publicId' = p_token)
      and data->>'status' = 'approved'
      and coalesce(data->'sharing'->>'revokedAt','') = ''
      and data->'sharing'->>'visibility' in ('unlisted','public')
    limit 1;
  if not found then raise exception 'NOT_FOUND'; end if;
  return to_jsonb(row);
end $$;

-- List approved, public, gallery-listed, non-revoked templates.
create or replace function public.forma_template_public_list()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
    into rows from public.forma_records r
    where r.kind = 'template_family'
      and r.data->>'status' = 'approved'
      and r.data->'sharing'->>'visibility' = 'public'
      and coalesce(r.data->'sharing'->'galleryListed','true'::jsonb) <> 'false'::jsonb
      and coalesce(r.data->'sharing'->>'revokedAt','') = '';
  return rows;
end $$;

-- Resolve an approved, forkable template by public id (public) or share token.
create or replace function public.forma_template_fork_source(p_id text, p_token text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare row public.forma_records;
begin
  if p_token is not null then
    select * into row from public.forma_records
      where kind = 'template_family'
        and data->'sharing'->>'shareToken' = p_token
        and data->>'status' = 'approved'
        and coalesce(data->'sharing'->>'revokedAt','') = ''
        and coalesce((data->'sharing'->>'allowForking')::boolean,false);
  else
    select * into row from public.forma_records
      where kind = 'template_family' and id = p_id
        and data->>'status' = 'approved'
        and data->'sharing'->>'visibility' = 'public'
        and coalesce(data->'sharing'->>'revokedAt','') = ''
        and coalesce((data->'sharing'->>'allowForking')::boolean,false);
  end if;
  if not found then raise exception 'NOT_FOUND'; end if;
  return to_jsonb(row);
end $$;

revoke all on function public.forma_template_shared(text) from public;
revoke all on function public.forma_template_public_list() from public;
revoke all on function public.forma_template_fork_source(text,text) from public;
grant execute on function public.forma_template_shared(text),
  public.forma_template_public_list(),
  public.forma_template_fork_source(text,text) to anon, authenticated;
commit;
