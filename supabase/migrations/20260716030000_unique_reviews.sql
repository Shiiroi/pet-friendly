-- Deletes duplicate reports, keeping only the latest report per place/device combination
delete from pet_policy_reports a
using pet_policy_reports b
where a.id < b.id
  and a.place_id = b.place_id
  and a.device_id = b.device_id;

-- Adds a unique constraint to ensure each device has exactly one active policy report per place
alter table pet_policy_reports
add constraint unique_place_device_report unique (place_id, device_id);
