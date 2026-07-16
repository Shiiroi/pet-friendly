-- Creates a transactional helper to insert a place and its initial report together.
-- Saves separate tables queries client-side and prevents orphaned place entries.
create or replace function create_place_with_report(
  p_name text,
  p_address text,
  p_city text,
  p_province text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_device_id uuid,
  p_claim text,
  p_notes text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_place_id uuid;
begin
  -- 1. Insert new place row
  insert into places (
    name,
    address,
    city,
    province,
    category,
    geom,
    status,
    created_by_device_id
  ) values (
    p_name,
    p_address,
    p_city,
    p_province,
    p_category,
    st_setsrid(st_point(p_longitude, p_latitude), 4326),
    'user_submitted',
    p_device_id
  )
  returning id into v_place_id;

  -- 2. Insert corresponding report row
  insert into pet_policy_reports (
    place_id,
    device_id,
    claim,
    notes
  ) values (
    v_place_id,
    p_device_id,
    p_claim,
    p_notes
  );

  return v_place_id;
end;
$$;
