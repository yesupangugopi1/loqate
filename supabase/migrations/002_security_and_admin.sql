-- Role helpers, admin policies and image bucket. Keep this after 001_initial_schema.sql.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger properties_updated_at before update on public.properties for each row execute procedure public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute procedure public.set_updated_at();

create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "admins manage properties" on public.properties for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage property images" on public.property_images for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read enquiries" on public.enquiries for select using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "published listing images are readable" on storage.objects for select using (
  bucket_id = 'property-images' and exists (
    select 1 from public.property_images i join public.properties p on p.id = i.property_id
    where i.storage_path = name and p.status = 'published'
  )
);
create policy "admins upload property images" on storage.objects for insert with check (bucket_id = 'property-images' and public.is_admin());
create policy "admins update property images" on storage.objects for update using (bucket_id = 'property-images' and public.is_admin());
create policy "admins delete property images" on storage.objects for delete using (bucket_id = 'property-images' and public.is_admin());
