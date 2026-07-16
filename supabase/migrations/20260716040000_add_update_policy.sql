-- Add RLS policy to allow anonymous updates/upserts on policy reports.
-- This allows client upsert operations to overwrite previous review votes.
create policy "Allow anonymous update for reports"
  on pet_policy_reports for update
  using (true)
  with check (true);
