alter table issues
  add column if not exists related_task_id text
  references cx_tasks (id) on delete set null;

alter table issues
  add column if not exists photo_paths text[] not null default '{}';

create index if not exists issues_related_task_idx on issues (related_task_id);
