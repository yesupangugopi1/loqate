-- LOQATE foundation: run in a Supabase migration. Requires the PostGIS extension.
create extension if not exists postgis;
create extension if not exists pgcrypto;

create type public.listing_type as enum ('sale', 'rent');
create type public.listing_status as enum ('draft', 'published', 'archived');
create type public.app_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  listing_type public.listing_type not null,
  status public.listing_status not null default 'draft',
  title text not null check (char_length(title) between 4 and 140),
  description text not null check (char_length(description) between 20 and 5000),
  price numeric(14,2) not null check (price >= 0),
  currency char(3) not null default 'INR',
  bedrooms smallint check (bedrooms >= 0), bathrooms smallint check (bathrooms >= 0),
  area_sqft integer check (area_sqft > 0), property_type text not null,
  address_line text not null, city text not null, state text, postal_code text,
  location geography(point, 4326) not null,
  listed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index properties_public_search_idx on public.properties (listing_type, status, city);
create index properties_location_idx on public.properties using gist (location);

create table public.property_images (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null, alt_text text, position smallint not null default 0, created_at timestamptz not null default now(), unique(property_id, position)
);
create table public.saved_properties (user_id uuid references public.profiles(id) on delete cascade, property_id uuid references public.properties(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id, property_id));
create table public.enquiries (id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id), user_id uuid references public.profiles(id), name text not null, email text not null, phone text, message text, created_at timestamptz not null default now());
create table public.conversations (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.conversation_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade, role text not null check(role in ('user','assistant','tool')), content jsonb not null, created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.properties enable row level security; alter table public.property_images enable row level security; alter table public.saved_properties enable row level security; alter table public.enquiries enable row level security; alter table public.conversations enable row level security; alter table public.conversation_messages enable row level security;
create policy "published properties are public" on public.properties for select using (status = 'published');
create policy "published images are public" on public.property_images for select using (exists(select 1 from public.properties p where p.id = property_id and p.status = 'published'));
create policy "users manage own saves" on public.saved_properties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own enquiries" on public.enquiries for select using (auth.uid() = user_id);
create policy "users create enquiries" on public.enquiries for insert with check (auth.uid() = user_id or user_id is null);
create policy "users own conversations" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own messages" on public.conversation_messages for select using (exists(select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create or replace function public.search_published_properties(query_text text default null, wanted_type public.listing_type default null, min_price numeric default null, max_price numeric default null, min_bedrooms smallint default null, latitude double precision default null, longitude double precision default null, radius_km double precision default null)
returns table(id uuid, title text, listing_type public.listing_type, price numeric, currency char(3), bedrooms smallint, bathrooms smallint, area_sqft integer, city text, property_type text, distance_km numeric)
language sql stable security invoker as $$
  select p.id,p.title,p.listing_type,p.price,p.currency,p.bedrooms,p.bathrooms,p.area_sqft,p.city,p.property_type,
    case when latitude is not null and longitude is not null then round((st_distance(p.location, st_setsrid(st_makepoint(longitude,latitude),4326)::geography)/1000)::numeric,2) end
  from public.properties p where p.status='published'
    and (wanted_type is null or p.listing_type=wanted_type) and (min_price is null or p.price>=min_price) and (max_price is null or p.price<=max_price) and (min_bedrooms is null or p.bedrooms>=min_bedrooms)
    and (query_text is null or p.title ilike '%'||query_text||'%' or p.city ilike '%'||query_text||'%' or p.description ilike '%'||query_text||'%')
    and (radius_km is null or latitude is null or longitude is null or st_dwithin(p.location,st_setsrid(st_makepoint(longitude,latitude),4326)::geography,radius_km*1000))
  order by p.created_at desc limit 60;
$$;
