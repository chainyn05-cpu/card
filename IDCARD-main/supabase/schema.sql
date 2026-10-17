-- Company 99 Employee ID Card Generator — Admin-only dashboard.
-- Public/anonymous users may submit new records and upload photos only.
-- Reading employee records and photos is performed by Vercel API using a server-only service-role key.
create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('PUZZLE', 'BAT', 'POS TRAIN')),
  full_name text not null,
  position text not null,
  employee_id text not null,
  phone text default '',
  department text default '',
  photo_path text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;
revoke all on public.employees from anon, authenticated;
grant insert on public.employees to anon, authenticated;

-- Remove all old employee-table policies, including auto-generated policy names
-- from earlier setup attempts, so no public SELECT policy survives.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'employees'
  loop
    execute format('drop policy if exists %I on public.employees', p.policyname);
  end loop;
end $$;

create policy "Public can submit employee forms"
  on public.employees for insert to anon, authenticated
  with check (status = 'Pending');

-- Private photo bucket. Anonymous staff can upload, but cannot read/list/update/delete photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Remove policies on storage.objects that mention this bucket, including custom names
-- created by earlier setup attempts, without touching other buckets.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (
        coalesce(qual, '') ilike '%employee-photos%'
        or coalesce(with_check, '') ilike '%employee-photos%'
        or policyname ilike '%employee photo%'
        or policyname ilike '%idcard%'
        or policyname ilike '%chaidcard%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "Public can upload employee photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'employee-photos');
