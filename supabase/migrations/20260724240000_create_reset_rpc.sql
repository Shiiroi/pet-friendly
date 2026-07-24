-- Create stored procedure for resetting database tables live
create or replace function admin_reset_database(p_target text default 'all') returns void as $$
begin
  if p_target = 'all' then
    truncate table flags, pet_policy_reports, places, devices cascade;
  elsif p_target = 'places' then
    truncate table flags, pet_policy_reports, places cascade;
  elsif p_target = 'users' then
    truncate table flags, pet_policy_reports, devices cascade;
  end if;
end;
$$ language plpgsql security definer;

-- Allow public execution of reset function for admin scripts
grant execute on function admin_reset_database(text) to anon, authenticated, postgres, service_role;
