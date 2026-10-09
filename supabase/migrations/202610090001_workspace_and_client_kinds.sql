-- Agency Workspace v1 (Phase 7).
-- Adds the `workspace` and `client` record kinds to forma_records.
-- Existing kinds and records are unchanged.
begin;
alter table public.forma_records drop constraint if exists forma_records_kind_check;
alter table public.forma_records add constraint forma_records_kind_check
  check (kind in ('project','revision','review','brand','template','skill','template_family','workspace','client'));

create or replace function public.forma_save(p_kind text,p_id text,p_data jsonb,p_expected integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.forma_records; result public.forma_records; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'NOT_FOUND'; end if;
 if p_kind not in ('project','review','brand','template','skill','template_family','workspace','client') or p_expected<0
    or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>4000000 then
   raise exception 'INVALID_INPUT';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_id,0));
 select * into old from public.forma_records where id=p_id and kind=p_kind for update;
 if found and old.owner_id<>actor then raise exception 'NOT_FOUND'; end if;
 if coalesce(old.version,0)<>p_expected then raise exception 'VERSION_CONFLICT'; end if;
 if p_kind='review' then
   if old.id is not null or not exists(select 1 from public.forma_records
     where kind='project' and id=p_data->>'projectId' and owner_id=actor) then
     raise exception 'NOT_FOUND';
   end if;
   if p_data ? 'requireAuthenticatedApproval' and
      jsonb_typeof(p_data->'requireAuthenticatedApproval')<>'boolean' then
     raise exception 'INVALID_INPUT';
   end if;
   p_data:=jsonb_build_object(
     'project',(select data from public.forma_records
       where kind='project' and id=p_data->>'projectId' and owner_id=actor),
     'projectId',p_data->>'projectId',
     'comments','[]'::jsonb,
     'status','pending',
     'expiresAt',least((p_data->>'expiresAt')::timestamptz,now()+interval '30 days'),
     'requireAuthenticatedApproval',coalesce((p_data->>'requireAuthenticatedApproval')::boolean,false));
 end if;
 insert into public.forma_records(id,owner_id,kind,data,version)
   values(p_id,actor,p_kind,p_data,p_expected+1)
   on conflict(id,kind) do update set data=excluded.data,version=excluded.version,created_at=now()
   returning * into result;
 if p_kind='project' then
   insert into public.forma_records(id,owner_id,kind,data,version)
     values(gen_random_uuid()::text,actor,'revision',
       jsonb_build_object('project',p_data,'projectId',p_id),result.version);
 end if;
 return to_jsonb(result);
end $$;

create or replace function public.forma_remove(p_kind text,p_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_kind not in ('project','review','brand','template','skill','template_family','workspace','client') then
   raise exception 'NOT_FOUND';
 end if;
 delete from public.forma_records where owner_id=auth.uid() and kind=p_kind and id=p_id;
 if p_kind='project' then
   delete from public.forma_records where owner_id=auth.uid()
     and kind in ('revision','review') and data->>'projectId'=p_id;
 end if;
end $$;

commit;
