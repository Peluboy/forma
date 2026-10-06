-- Run in the Supabase SQL editor or through supabase db push.
create table if not exists public.forma_records (
 id text not null, owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('project','revision','review','brand')),
 data jsonb not null, version integer not null check(version>0),
 created_at timestamptz not null default now(), primary key(id,kind)
);
create index if not exists forma_records_owner on public.forma_records(owner_id,kind);
alter table public.forma_records enable row level security;
create policy forma_owner_read on public.forma_records for select to authenticated using(owner_id=auth.uid());
-- All mutations use restricted functions to preserve history and concurrency.
revoke all on public.forma_records from anon,authenticated;
grant select on public.forma_records to authenticated;
create or replace function public.forma_save(p_kind text,p_id text,p_data jsonb,p_expected integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.forma_records; result public.forma_records; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'NOT_FOUND'; end if;
 if p_kind not in ('project','review','brand') or p_expected<0 or octet_length(p_data::text)>4000000 then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_id,0));
 select * into old from public.forma_records where id=p_id and kind=p_kind for update;
 if found and old.owner_id<>actor then raise exception 'NOT_FOUND'; end if;
 if coalesce(old.version,0)<>p_expected then raise exception 'VERSION_CONFLICT'; end if;
 if p_kind='review' then
   if old.id is not null or not exists(select 1 from public.forma_records where kind='project' and id=p_data->>'projectId' and owner_id=actor) then raise exception 'NOT_FOUND'; end if;
   -- Snapshot comes from the saved project, never from caller-supplied public data.
   p_data:=jsonb_build_object('project',(select data from public.forma_records where kind='project' and id=p_data->>'projectId' and owner_id=actor),'projectId',p_data->>'projectId','comments','[]'::jsonb,'status','pending','expiresAt',least((p_data->>'expiresAt')::timestamptz,now()+interval '30 days'));
 end if;
 insert into public.forma_records(id,owner_id,kind,data,version) values(p_id,actor,p_kind,p_data,p_expected+1)
 on conflict(id,kind) do update set data=excluded.data,version=excluded.version,created_at=now() returning * into result;
 if p_kind='project' then insert into public.forma_records(id,owner_id,kind,data,version) values(gen_random_uuid()::text,actor,'revision',jsonb_build_object('project',p_data,'projectId',p_id),result.version); end if;
 return to_jsonb(result);
end $$;
create or replace function public.forma_remove(p_kind text,p_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_kind not in ('project','review','brand') then raise exception 'NOT_FOUND'; end if;
 delete from public.forma_records where owner_id=auth.uid() and kind=p_kind and id=p_id;
 if p_kind='project' then delete from public.forma_records where owner_id=auth.uid() and kind in ('revision','review') and data->>'projectId'=p_id; end if;
end $$;
create or replace function public.forma_review(p_token text,p_action text default 'read',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare row public.forma_records; content jsonb;
begin
 if length(p_token)<>48 then raise exception 'NOT_FOUND'; end if;
 select * into row from public.forma_records where id=p_token and kind='review' for update;
 if not found or (row.data->>'expiresAt')::timestamptz<=now() then raise exception 'NOT_FOUND'; end if;
 content:=row.data;
 if p_action not in ('read','comment','status') then raise exception 'INVALID_INPUT'; end if;
 if p_action<>'read' and (length(trim(coalesce(p_payload->>'author','')))=0 or length(p_payload->>'author')>80) then raise exception 'INVALID_INPUT'; end if;
 if p_action='comment' then
 if length(trim(coalesce(p_payload->>'body','')))=0 or length(p_payload->>'body')>2000 or jsonb_array_length(content->'comments')>=200 then raise exception 'INVALID_INPUT'; end if;
 content:=jsonb_set(content,'{comments}',(content->'comments')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'author',p_payload->>'author','body',p_payload->>'body','createdAt',now())));
 elsif p_action='status' then
 if coalesce(p_payload->>'status','') not in ('approved','changes_requested') then raise exception 'INVALID_INPUT'; end if;
 content:=content||jsonb_build_object('status',p_payload->>'status','statusBy',p_payload->>'author');
 end if;
 if p_action<>'read' then update public.forma_records set data=content where id=p_token and kind='review'; end if;
 return content;
end $$;
revoke all on function public.forma_save(text,text,jsonb,integer) from public;
revoke all on function public.forma_remove(text,text) from public;
revoke all on function public.forma_review(text,text,jsonb) from public;
grant execute on function public.forma_save(text,text,jsonb,integer),public.forma_remove(text,text) to authenticated;
grant execute on function public.forma_review(text,text,jsonb) to anon,authenticated;

-- Persistent user quotas also apply across concurrent Vercel instances.
create table if not exists public.forma_analysis_usage(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(), requests integer not null default 0
);
alter table public.forma_analysis_usage enable row level security;
revoke all on public.forma_analysis_usage from anon,authenticated;
create or replace function public.forma_consume_analysis()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare usage public.forma_analysis_usage;
begin
 if auth.uid() is null then raise exception 'NOT_FOUND'; end if;
 insert into public.forma_analysis_usage(owner_id) values(auth.uid()) on conflict do nothing;
 select * into usage from public.forma_analysis_usage where owner_id=auth.uid() for update;
 if usage.window_start<=now()-interval '1 hour' then
 update public.forma_analysis_usage set window_start=now(),requests=1 where owner_id=auth.uid();
 elsif usage.requests>=10 then raise exception 'QUOTA_EXCEEDED';
 else update public.forma_analysis_usage set requests=requests+1 where owner_id=auth.uid(); end if;
end $$;
revoke all on function public.forma_consume_analysis() from public;
grant execute on function public.forma_consume_analysis() to authenticated;
