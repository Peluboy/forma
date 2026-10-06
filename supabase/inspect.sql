-- Read-only catalog inspection before migration. Does not read customer rows.
begin read only;
select current_database() as database_name, current_user as database_role;
select n.nspname as schema_name, c.relname as relation_name, c.relkind,
       c.relrowsecurity as rls_enabled, c.reltuples::bigint as estimated_rows
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','supabase_migrations')
  and c.relkind in ('r','p','v')
order by 1,2;
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name like 'forma_%'
order by table_name,ordinal_position;
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename like 'forma_%'
order by tablename,policyname;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,p.proacl as privileges,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'forma_%'
order by p.proname;
commit;
