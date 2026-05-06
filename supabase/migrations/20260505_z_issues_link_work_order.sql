alter table issues
  add column if not exists related_work_order_id uuid
  references mx_work_orders (id) on delete set null;

create index if not exists issues_related_wo_idx on issues (related_work_order_id);

create or replace function mx_work_orders_resolve_linked_issues()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update issues
       set status = 'resolved'
     where related_work_order_id = new.id
       and status <> 'resolved';
  end if;
  return new;
end;
$$;

drop trigger if exists mx_work_orders_resolve_issues on mx_work_orders;
create trigger mx_work_orders_resolve_issues
  after update of status on mx_work_orders
  for each row execute function mx_work_orders_resolve_linked_issues();
