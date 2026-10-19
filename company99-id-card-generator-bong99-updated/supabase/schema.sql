-- Company 99 Employee ID Card Generator: safe setup / migration SQL
-- Run in the existing Supabase project SQL Editor. Existing employee rows are preserved.
create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('PUZZLE', 'BAT', 'POS TRAIN')),
  full_name text not null,
  position text not null,
  employee_id text not null default '',
  phone text default '',
  department text default '',
  photo_path text,
  photo_zoom numeric not null default 1,
  photo_x numeric not null default 50,
  photo_y numeric not null default 50,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

-- Add the crop fields to existing tables without deleting any records.
-- Employee ID and Department are no longer collected by the form. Keep old columns for compatibility with existing records.
alter table public.employees alter column employee_id drop not null;
alter table public.employees alter column employee_id set default '';
alter table public.employees add column if not exists photo_zoom numeric not null default 1;
alter table public.employees add column if not exists photo_x numeric not null default 50;
alter table public.employees add column if not exists photo_y numeric not null default 50;
alter table public.employees enable row level security;

drop policy if exists "Public can submit employee forms" on public.employees;
create policy "Public can submit employee forms"
  on public.employees for insert to anon, authenticated
  with check (status = 'Pending');

drop policy if exists "Admins can view employee records" on public.employees;
drop policy if exists "Admins can update employee records" on public.employees;
drop policy if exists "Only Company 99 admins can view employee records" on public.employees;
drop policy if exists "Only Company 99 admins can update employee records" on public.employees;
create policy "Only Company 99 admins can view employee records"
  on public.employees for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Only Company 99 admins can update employee records"
  on public.employees for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Private photo bucket. 5 MB max; supported image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can upload employee photos" on storage.objects;
create policy "Public can upload employee photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'employee-photos');
drop policy if exists "Admins can view employee photos" on storage.objects;
drop policy if exists "Admins can delete employee photos" on storage.objects;
drop policy if exists "Only Company 99 admins can view employee photos" on storage.objects;
drop policy if exists "Only Company 99 admins can delete employee photos" on storage.objects;
create policy "Only Company 99 admins can view employee photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'employee-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Only Company 99 admins can delete employee photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'employee-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- After creating your admin user in Supabase Authentication > Users, assign admin role.
-- Replace the email below with the actual admin email, then run separately:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'admin@company.com';
-- Sign out and sign back in so the JWT receives the new role.
