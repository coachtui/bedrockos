alter table cx_tasks
  add column original_duration  integer,
  add column remaining_duration integer,
  add column predecessors        text[]      not null default '{}',
  add column successors          text[]      not null default '{}';
