-- Fix: schema cache miss for create_place_with_report
-- Drop ALL known previous overloads by exact parameter type signature, then recreate clean.

drop function if exists create_place_with_report(text, text, text, text, text,  double precision, double precision, uuid, text, text, text, text);
drop function if exists create_place_with_report(text, text, text, text, text[], double precision, double precision, uuid, text, text, text, text);
drop function if exists create_place_with_report(text, text, text, text, text[], double precision, double precision, uuid, text, text, text, text, jsonb);

create or replace function create_place_with_report(
  p_name            text,
  p_address         text,
  p_city            text,
  p_province        text,
  p_categories      text[],
  p_latitude        double precision,
  p_longitude       double precision,
  p_device_id       uuid,
  p_claim           text,
  p_pet_menu        text,
  p_price_range     text,
  p_notes           text,
  p_operating_hours jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_place_id     uuid;
  v_target_point geometry;
begin
  v_target_point := st_setsrid(st_point(p_longitude, p_latitude), 4326);

  -- Deduplicate: find any place with same name+coords within ~30m or identical coords within ~3m
  select id into v_place_id
  from places
  where
    (lower(trim(name)) = lower(trim(p_name)) and st_dwithin(geom, v_target_point, 0.001))
    or st_dwithin(geom, v_target_point, 0.0003)
  order by st_distance(geom, v_target_point) asc
  limit 1;

  if v_place_id is null then
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
    -- If duplicate found, still attempt to backfill hours if missing
    if p_operating_hours is not null then
      update places
      set operating_hours = coalesce(operating_hours, p_operating_hours)
      where id = v_place_id;
    end if;
  end if;

  -- Always insert initial report
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
