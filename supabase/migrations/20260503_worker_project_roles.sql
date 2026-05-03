-- Link workers to Supabase auth users
alter table workers add column if not exists user_id uuid references auth.users(id);
create index if not exists workers_user_id_idx on workers(user_id);
create unique index if not exists workers_user_id_unique on workers(user_id) where user_id is not null;

-- Project-scoped leadership positions
create table if not exists worker_project_roles (
  id          text primary key default gen_random_uuid()::text,
  org_id      text not null,
  worker_id   text not null references workers(id) on delete cascade,
  project_id  text not null references projects(id) on delete cascade,
  position    text not null check (position in ('superintendent', 'foreman')),
  created_at  timestamptz not null default now(),
  unique(worker_id, project_id)
);

create index if not exists wpr_org_project_idx on worker_project_roles(org_id, project_id);
create index if not exists wpr_worker_idx on worker_project_roles(worker_id);
