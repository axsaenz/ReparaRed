-- Provider bootstrap separate from Prisma domain migrations.
-- Re-runnable: the bucket is upserted and each policy is guarded by its name.

insert into storage.buckets (id, name, public)
values ('request-images', 'request-images', false)
on conflict (id) do update
set name = excluded.name,
    public = false;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request-images service role select'
  ) then
    create policy "request-images service role select"
      on storage.objects
      for select
      to service_role
      using (bucket_id = 'request-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request-images service role insert'
  ) then
    create policy "request-images service role insert"
      on storage.objects
      for insert
      to service_role
      with check (bucket_id = 'request-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request-images service role update'
  ) then
    create policy "request-images service role update"
      on storage.objects
      for update
      to service_role
      using (bucket_id = 'request-images')
      with check (bucket_id = 'request-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request-images service role delete'
  ) then
    create policy "request-images service role delete"
      on storage.objects
      for delete
      to service_role
      using (bucket_id = 'request-images');
  end if;
end $$;
