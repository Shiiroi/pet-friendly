-- 1. Create the devices table
create table devices (
  device_id uuid primary key,
  nickname text unique,
  claimed_by uuid references auth.users(id),
  contribution_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Backfill devices from existing data
insert into devices (device_id, nickname, created_at)
select distinct on (device_id) device_id, nickname, created_at
from (
  select created_by_device_id as device_id, created_by_nickname as nickname,
         created_at
  from places
  where created_by_device_id is not null
  union all
  select device_id, nickname, created_at
  from pet_policy_reports
  where device_id is not null
) combined
order by device_id, created_at asc
on conflict (device_id) do nothing;

-- 3. Add foreign keys now that devices is populated
alter table places
  add constraint places_device_fk foreign key (created_by_device_id)
  references devices(device_id);

alter table pet_policy_reports
  add constraint reports_device_fk foreign key (device_id)
  references devices(device_id);

alter table flags
  add constraint flags_device_fk foreign key (device_id)
  references devices(device_id);

-- 4. Drop now-redundant columns (nickname lives on devices now, not per-row)
alter table places drop column created_by_nickname;
alter table pet_policy_reports drop column nickname;

-- 5. Drop photos entirely (deliberately out of MVP scope now)
drop table if exists place_photos;

-- 6. Replace place_current_status with corroboration-aware views
-- BUSINESS RULE: Current status is decided by majority corroboration (most agreeing devices).
-- Ties are broken by the most recent report. Prevents single devices from overwriting consensus.
drop view if exists place_current_status;

create view place_report_summary as
select
  place_id,
  claim,
  count(distinct device_id) as agreeing_devices,
  max(created_at) as last_reported_at
from pet_policy_reports
group by place_id, claim;

create view place_current_status as
select distinct on (place_id)
  place_id, claim, agreeing_devices, last_reported_at
from place_report_summary
order by place_id, agreeing_devices desc, last_reported_at desc;

-- 7. Trigger function for corroboration-based contribution points.
-- BUSINESS RULE: Points are awarded when report is submitted:
-- - New reporter gets a point if claim matches an existing claim by a different device.
-- - First matching reporter for the place+claim gets a point for early reporting.
-- LIMITATION: Match on 3rd+ report double-counts the 1st matching reporter.
create or replace function bump_contribution_on_corroboration() returns trigger as $$
declare
  prior_agreeing_device uuid;
begin
  select device_id into prior_agreeing_device
  from pet_policy_reports
  where place_id = new.place_id
    and claim = new.claim
    and device_id != new.device_id
  order by created_at asc
  limit 1;

  if prior_agreeing_device is not null then
    update devices set contribution_count = contribution_count + 1
      where device_id = new.device_id;
    update devices set contribution_count = contribution_count + 1
      where device_id = prior_agreeing_device;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger corroboration_trigger
after insert on pet_policy_reports
for each row execute function bump_contribution_on_corroboration();

-- 8. RLS for the new devices table
alter table devices enable row level security;
create policy "public read devices" on devices for select using (true);
create policy "public insert devices" on devices for insert with check (true);
create policy "device can update own row" on devices for update
  using (true) with check (true);
