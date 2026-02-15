alter table public.potholes
  add column if not exists normalized_address text,
  add column if not exists parish text,
  add column if not exists municipality text,
  add column if not exists district text,
  add column if not exists postal_code text,
  add column if not exists geocode_status text not null default 'pending',
  add column if not exists geocoded_at timestamptz;

alter table public.potholes
  add constraint potholes_geocode_status_check
  check (geocode_status in ('pending', 'resolved', 'failed', 'manual'));

update public.potholes
set geocode_status = case
  when address is null or btrim(address) = '' then 'pending'
  else 'manual'
end
where geocode_status is null or geocode_status = 'pending';

create index if not exists idx_potholes_geocode_status on public.potholes(geocode_status);
create index if not exists idx_potholes_municipality on public.potholes(municipality);
create index if not exists idx_potholes_district on public.potholes(district);
