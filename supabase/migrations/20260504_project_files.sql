create table if not exists project_files (
  id           uuid        primary key default gen_random_uuid(),
  org_id       text        not null,
  project_id   text        not null,
  storage_path text        not null unique,
  file_name    text        not null,
  file_size    bigint      not null,
  mime_type    text        not null,
  uploaded_by  text        not null,
  uploaded_at  timestamptz not null default now()
);

create index if not exists project_files_project_idx
  on project_files (org_id, project_id, uploaded_at desc);

-- RLS: to be added when auth is introduced. Until then, all access
-- is via the service-role client in server actions only.

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;
