-- 1. Add categories text[] column to places table
alter table places add column if not exists categories text[] not null default '{}';

-- 2. Populate categories from existing category column
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'places' and column_name = 'category'
  ) then
    update places 
    set categories = ARRAY[category] 
    where category is not null and category != '';
  end if;
end $$;

-- 3. Drop existing single category column if present
alter table places drop column if exists category cascade;

-- 4. Re-create create_place_with_report RPC with p_categories text[] parameter
drop function if exists create_place_with_report(text, text, text, text, text, double precision, double precision, uuid, text, text, text, text);
drop function if exists create_place_with_report(text, text, text, text, text[], double precision, double precision, uuid, text, text, text, text);

create or replace function create_place_with_report(
  p_name text,
  p_address text,
  p_city text,
  p_province text,
  p_categories text[],
  p_latitude double precision,
  p_longitude double precision,
  p_device_id uuid,
  p_claim text,
  p_pet_menu text,
  p_price_range text,
  p_notes text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_place_id uuid;
begin
  -- Insert new place row
  insert into places (
    name,
    address,
    city,
    province,
    categories,
    geom,
    status,
    created_by_device_id
  ) values (
    p_name,
    p_address,
    p_city,
    p_province,
    p_categories,
    st_setsrid(st_point(p_longitude, p_latitude), 4326),
    'user_submitted',
    p_device_id
  )
  returning id into v_place_id;

  -- Insert corresponding report row
  insert into pet_policy_reports (
    place_id,
    device_id,
    claim,
    pet_menu,
    price_range,
    notes
  ) values (
    v_place_id,
    p_device_id,
    p_claim,
    p_pet_menu,
    p_price_range,
    p_notes
  );

  return v_place_id;
end;
$$;

-- 5. Re-create get_places_in_bounds RPC returning categories text[]
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
