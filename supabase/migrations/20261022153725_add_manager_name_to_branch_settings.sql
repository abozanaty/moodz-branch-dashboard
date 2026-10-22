ALTER TABLE public.branch_settings
  ADD COLUMN IF NOT EXISTS manager_name text;
