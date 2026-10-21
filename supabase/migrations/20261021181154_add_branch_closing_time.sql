ALTER TABLE public.branch_settings
  ADD COLUMN IF NOT EXISTS closing_time time without time zone;

ALTER TABLE public.branch_opening_time_history
  ADD COLUMN IF NOT EXISTS closing_time time without time zone;
