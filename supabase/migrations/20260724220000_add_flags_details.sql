-- Add details column to flags table for reasoned report submissions
alter table flags add column if not exists details text;
