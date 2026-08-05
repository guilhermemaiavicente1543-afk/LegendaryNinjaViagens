alter table public.site_announcements
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists action_target text not null default 'none',
  add column if not exists action_label text,
  add column if not exists action_url text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

do $$
begin
  alter table public.site_announcements
    add constraint site_announcements_action_target_check
    check (
      action_target in (
        'none',
        'my-ninja',
        'map',
        'shinobidex',
        'anced',
        'legends',
        'admin',
        'external'
      )
    );
exception
  when duplicate_object then null;
end
$$;

create index if not exists site_announcements_active_priority_idx
  on public.site_announcements (
    is_active,
    priority desc,
    created_at desc
  );

create index if not exists site_announcements_schedule_idx
  on public.site_announcements (
    starts_at,
    ends_at
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'announcement-images',
  'announcement-images',
  true,
  6291456,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists
  "Public can view announcement images"
on storage.objects;

create policy
  "Public can view announcement images"
on storage.objects
for select
to public
using (
  bucket_id = 'announcement-images'
);

drop policy if exists
  "Admins can upload announcement images"
on storage.objects;

create policy
  "Admins can upload announcement images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'announcement-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists
  "Admins can update announcement images"
on storage.objects;

create policy
  "Admins can update announcement images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'announcement-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'announcement-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists
  "Admins can delete announcement images"
on storage.objects;

create policy
  "Admins can delete announcement images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'announcement-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

notify pgrst, 'reload schema';
