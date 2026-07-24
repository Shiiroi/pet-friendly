-- 1. Re-create create_place_with_report RPC with duplicate place safeguard
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
  p_notes text,
  p_operating_hours jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_place_id uuid;
  v_target_point geometry;
begin
  v_target_point := st_setsrid(st_point(p_longitude, p_latitude), 4326);

  -- Check if a place with identical name or within ~30 meters (0.0003 degrees) already exists
  select id into v_place_id
  from places
  where 
    (lower(trim(name)) = lower(trim(p_name)) and st_dwithin(geom, v_target_point, 0.001))
    or st_dwithin(geom, v_target_point, 0.0003)
  order by st_distance(geom, v_target_point) asc
  limit 1;

  if v_place_id is null then
    -- Insert new place row if no duplicate exists
    insert into places (
      name,
      address,
      city,
      province,
      categories,
      geom,
      status,
      created_by_device_id,
      operating_hours
    ) values (
      p_name,
      p_address,
      p_city,
      p_province,
      p_categories,
      v_target_point,
      'user_submitted',
      p_device_id,
      p_operating_hours
    )
    returning id into v_place_id;
  else
    -- If place already exists, update operating_hours if current value is null
    if p_operating_hours is not null then
      update places
      set operating_hours = coalesce(operating_hours, p_operating_hours)
      where id = v_place_id;
    end if;
  end if;

  -- Insert corresponding report row for the place (linked to new or existing place_id)
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

-- 2. Deduplicate pre-existing places with matching names & coordinates in database
do $$
declare
  r record;
  v_keep_id uuid;
  v_dup_id uuid;
begin
  for r in (
    select lower(trim(name)) as norm_name, round(st_y(geom)::numeric, 3) as lat_group, round(st_x(geom)::numeric, 3) as lng_group, array_agg(id order by created_at asc) as ids
    from places
    group by lower(trim(name)), round(st_y(geom)::numeric, 3), round(st_x(geom)::numeric, 3)
    having count(*) > 1
  ) loop
    v_keep_id := r.ids[1];
    foreach v_dup_id in array r.ids[2:] loop
      update pet_policy_reports set place_id = v_keep_id where place_id = v_dup_id;
      update place_disputes set place_id = v_keep_id where place_id = v_dup_id;
      delete from places where id = v_dup_id;
    end loop;
  end loop;
end $$;
