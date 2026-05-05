-- Allow 'safety' as a valid module value on issues + activity.

alter table issues drop constraint if exists issues_module_check;
alter table issues add constraint issues_module_check
  check (module in ('cru','fix','inspect','datum','ops','mx','schedule','safety'));

alter table activity drop constraint if exists activity_module_check;
alter table activity add constraint activity_module_check
  check (module in ('cru','fix','inspect','datum','ops','mx','schedule','shell','safety'));
