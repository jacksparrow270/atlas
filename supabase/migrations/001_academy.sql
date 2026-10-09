-- Run once in the Supabase SQL editor or with supabase db push.
create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Shared curriculum lives in version control. Progress uses stable content IDs.
-- A discriminated record table avoids whole-workspace last-write-wins conflicts.
create table public.study_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('lesson','task','focus','assessment','project','resource','review','career','interview')),
 id text not null check (id ~ '^[a-zA-Z0-9_-]{1,120}$'),
 data jsonb not null check (jsonb_typeof(data)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,kind,id)
);
create index study_records_recent on public.study_records(user_id,updated_at desc);
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger records_updated before update on public.study_records for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
alter table public.study_records enable row level security;
create policy profile_owner on public.profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy record_owner on public.study_records for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.profiles,public.study_records from anon;
grant select,insert,update,delete on public.profiles,public.study_records to authenticated;
-- Security invoker retains RLS. Import merges atomically and never accepts ownership from a file.
create function public.import_backup(backup jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare r jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if backup->>'version' is distinct from '1' or jsonb_typeof(backup->'records') is distinct from 'array' or jsonb_typeof(backup->'preferences') is distinct from 'object' then raise exception 'Invalid backup'; end if;
 if jsonb_array_length(backup->'records') > 10000 then raise exception 'Backup too large'; end if;
 insert into public.profiles(user_id,preferences) values(auth.uid(),backup->'preferences')
 on conflict(user_id) do update set preferences=excluded.preferences;
 for r in select * from jsonb_array_elements(backup->'records') loop
 insert into public.study_records(user_id,kind,id,data) values(auth.uid(),r->>'kind',r->>'id',r->'data')
 on conflict(user_id,kind,id) do update set data=excluded.data;
 end loop;
end; $$;
revoke all on function public.import_backup(jsonb) from public,anon;
grant execute on function public.import_backup(jsonb) to authenticated;


