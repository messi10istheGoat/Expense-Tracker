-- Apply to a dedicated Supabase project. Client keys have no privilege to bypass RLS.
create table public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload @> '{"version":1,"demo":false}'::jsonb and octet_length(payload::text) <= 10485760),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
create policy "Read own workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.workspaces from anon, authenticated;
grant select on public.workspaces to authenticated;
-- All writes go through this compare-and-swap operation. No last-writer-wins upsert.
create function public.save_workspace(p_payload jsonb, p_expected_revision bigint)
returns setof public.workspaces
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); result public.workspaces;
begin
  if owner is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid revision' using errcode='22023'; end if;
  if p_expected_revision = 0 then
    insert into public.workspaces(user_id,payload,revision) values(owner,p_payload,1)
      on conflict(user_id) do nothing returning * into result;
  else
    update public.workspaces set payload=p_payload, revision=revision+1, updated_at=now()
      where user_id=owner and revision=p_expected_revision returning * into result;
  end if;
  if result.user_id is null then raise exception 'Workspace changed' using errcode='40001'; end if;
  return next result;
end; $$;
revoke all on function public.save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.save_workspace(jsonb,bigint) to authenticated;
