-- 1. Drop existing views dependent on summaries
drop view if exists place_current_status cascade;
drop view if exists place_current_pet_menu cascade;
drop view if exists place_current_price_range cascade;

-- 2. Re-create place_current_status with runner-up calculations
create or replace view place_current_status as
with ranked as (
  select
    place_id,
    claim,
    agreeing_devices,
    row_number() over (partition by place_id order by agreeing_devices desc, last_reported_at desc) as rank
  from place_report_summary
)
select
  r1.place_id,
  r1.claim,
  r1.agreeing_devices,
  r2.claim as runner_up_claim,
  coalesce(r2.agreeing_devices, 0)::bigint as runner_up_agreeing_devices
from ranked r1
left join ranked r2 on r1.place_id = r2.place_id and r2.rank = 2
where r1.rank = 1;

-- 3. Re-create place_current_pet_menu with runner-up calculations
create or replace view place_current_pet_menu as
with ranked as (
  select
    place_id,
    pet_menu,
    agreeing_devices,
    row_number() over (partition by place_id order by agreeing_devices desc, last_reported_at desc) as rank
  from place_pet_menu_summary
)
select
  r1.place_id,
  r1.pet_menu,
  r1.agreeing_devices,
  r2.pet_menu as runner_up_pet_menu,
  coalesce(r2.agreeing_devices, 0)::bigint as runner_up_agreeing_devices
from ranked r1
left join ranked r2 on r1.place_id = r2.place_id and r2.rank = 2
where r1.rank = 1;

-- 4. Re-create place_current_price_range with runner-up calculations
create or replace view place_current_price_range as
with ranked as (
  select
    place_id,
    price_range,
    agreeing_devices,
    row_number() over (partition by place_id order by agreeing_devices desc, last_reported_at desc) as rank
  from place_price_range_summary
)
select
  r1.place_id,
  r1.price_range,
  r1.agreeing_devices,
  r2.price_range as runner_up_price_range,
  coalesce(r2.agreeing_devices, 0)::bigint as runner_up_agreeing_devices
from ranked r1
left join ranked r2 on r1.place_id = r2.place_id and r2.rank = 2
where r1.rank = 1;

-- 5. Drop and recreate get_places_in_bounds function to include runner-up data
drop function if exists get_places_in_bounds(double precision, double precision, double precision, double precision);

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
  price_range_runner_up_agreeing_devices bigint
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
    coalesce(pcpr.runner_up_agreeing_devices, 0)::bigint as price_range_runner_up_agreeing_devices
  from places p
  left join place_current_status pcs on p.id = pcs.place_id
  left join place_current_pet_menu pcpm on p.id = pcpm.place_id
  left join place_current_price_range pcpr on p.id = pcpr.place_id
  where p.status != 'delisted'
    -- Bounding box check using GIST index spatial operator
    and p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);
end;
$$;
