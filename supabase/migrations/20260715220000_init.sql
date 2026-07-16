-- Enable PostGIS extension for spatial query support
create extension if not exists postgis;

-- 1. Core places table
create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  geom geometry(Point, 4326) not null,
  category text,
  city text,
  province text,
  status text not null default 'user_submitted',
  -- status: 'user_submitted' | 'verified' | 'under_review' | 'delisted'
  created_by_device_id uuid,
  created_by_nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spatial index using GIST
create index places_geom_idx on places using gist (geom);

-- 2. Pet policy reports
create table pet_policy_reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  device_id uuid not null,
  nickname text,
  claim text not null,                    -- 'allowed' | 'not_allowed' | 'outdoor_only'
  notes text,
  created_at timestamptz not null default now()
);

create index pet_policy_reports_place_idx on pet_policy_reports(place_id);

-- 3. View for place current status (latest policy report per place)
create view place_current_status as
select distinct on (place_id)
  place_id, claim, notes, created_at
from pet_policy_reports
order by place_id, created_at desc;

-- 4. Place photos
create table place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  storage_path text not null,
  device_id uuid not null,
  created_at timestamptz not null default now()
);

-- 5. Flags for review reporting
create table flags (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  device_id uuid not null,
  reason text not null,                   -- 'closed' | 'wrong_info' | 'duplicate' | 'spam'
  created_at timestamptz not null default now()
);

-- 6. Trigger to auto flag places for review on 3+ distinct reporters
create or replace function check_flag_threshold() returns trigger as $$
declare
  distinct_flaggers int;
begin
  select count(distinct device_id) into distinct_flaggers
  from flags where place_id = new.place_id;

  if distinct_flaggers >= 3 then
    update places set status = 'under_review' where id = new.place_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger flag_threshold_trigger
after insert on flags
for each row execute function check_flag_threshold();

-- 7. Row Level Security (RLS) Configuration

-- Enable RLS on all tables
alter table places enable row level security;
alter table pet_policy_reports enable row level security;
alter table place_photos enable row level security;
alter table flags enable row level security;

-- Places policies
create policy "Allow anonymous select for active places"
  on places for select
  using (status != 'delisted');

create policy "Allow anonymous insert for places"
  on places for insert
  with check (true);
  -- TODO: Implement device-level rate limit checks via Edge Functions

-- Pet policy reports policies
create policy "Allow anonymous select for reports"
  on pet_policy_reports for select
  using (true);

create policy "Allow anonymous insert for reports"
  on pet_policy_reports for insert
  with check (true);
  -- TODO: Implement device-level rate limit checks via Edge Functions

-- Place photos policies
create policy "Allow anonymous select for photos"
  on place_photos for select
  using (true);

create policy "Allow anonymous insert for photos"
  on place_photos for insert
  with check (true);
  -- TODO: Implement device-level rate limit checks via Edge Functions

-- Flags policies (anonymous insert only, no public select permitted)
create policy "Allow anonymous insert for flags"
  on flags for insert
  with check (true);
  -- TODO: Implement device-level rate limit checks via Edge Functions
