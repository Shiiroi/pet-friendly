-- Drop the old function signature first to avoid column mismatch conflicts on update
drop function if exists get_places_in_bounds(double precision, double precision, double precision, double precision);

-- Create the updated function returning the city column
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
  category text,
  status text,
  claim text,
  agreeing_devices bigint
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
    p.category,
    p.status,
    pcs.claim,
    coalesce(pcs.agreeing_devices, 0)::bigint as agreeing_devices
  from places p
  left join place_current_status pcs on p.id = pcs.place_id
  where p.status != 'delisted'
    -- Bounding box check using GIST index spatial operator
    and p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);
end;
$$;
