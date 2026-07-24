-- Fix: get_places_in_bounds return type change (menu_photos column added)
-- Must drop and recreate since Postgres cannot change return types with CREATE OR REPLACE.
-- Also marks 20260724160000 migration as applied for remote instances that failed mid-run.

-- Apply the menu_photos column (idempotent)
alter table places add column if not exists menu_photos jsonb default '[]'::jsonb;

-- RPC to append a menu photo (idempotent)
create or replace function add_place_menu_photo(
  p_place_id uuid,
  p_photo jsonb
)
returns boolean
language plpgsql
security definer
as $$
begin
  update places
  set menu_photos = coalesce(menu_photos, '[]'::jsonb) || p_photo,
      updated_at = now()
  where id = p_place_id;
  return true;
end;
$$;

-- Drop get_places_in_bounds with ALL known previous overload signatures
drop function if exists get_places_in_bounds(double precision, double precision, double precision, double precision);

-- Recreate with menu_photos in return type
create or replace function get_places_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns table (
  id uuid,
  name text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  categories text[],
  status text,
  claim text,
  agreeing_devices bigint,
  runner_up_claim text,
  runner_up_agreeing_devices bigint,
  pet_menu text,
  pet_menu_agreeing_devices bigint,
  runner_up_pet_menu text,
  pet_menu_runner_up_agreeing_devices bigint,
  price_range text,
  price_range_agreeing_devices bigint,
  runner_up_price_range text,
  price_range_runner_up_agreeing_devices bigint,
  operating_hours jsonb,
  menu_photos jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.address,
    p.city,
    st_y(p.geom::geometry) as latitude,
    st_x(p.geom::geometry) as longitude,
    p.categories,
    p.status,
    pcs.claim,
    coalesce(pcs.agreeing_devices, 0)::bigint as agreeing_devices,
    pcs.runner_up_claim,
    coalesce(pcs.runner_up_agreeing_devices, 0)::bigint as runner_up_agreeing_devices,
    pcpm.pet_menu,
    coalesce(pcpm.agreeing_devices, 0)::bigint as pet_menu_agreeing_devices,
    pcpm.runner_up_pet_menu,
    coalesce(pcpm.runner_up_agreeing_devices, 0)::bigint as pet_menu_runner_up_agreeing_devices,
    pcpr.price_range,
    coalesce(pcpr.agreeing_devices, 0)::bigint as price_range_agreeing_devices,
    pcpr.runner_up_price_range,
    coalesce(pcpr.runner_up_agreeing_devices, 0)::bigint as price_range_runner_up_agreeing_devices,
    p.operating_hours,
    coalesce(p.menu_photos, '[]'::jsonb)
  from places p
  left join place_current_status pcs on p.id = pcs.place_id
  left join place_current_pet_menu pcpm on p.id = pcpm.place_id
  left join place_current_price_range pcpr on p.id = pcpr.place_id
  where p.status != 'delisted'
    and p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);
end;
$$;
