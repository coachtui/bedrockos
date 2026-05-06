-- supabase/migrations/20260504_projects_working_holidays.sql
alter table projects
  add column if not exists working_holiday_dates text[] not null default '{}';
