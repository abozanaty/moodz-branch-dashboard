ALTER TABLE public.branch_daily_revenue
  ADD COLUMN IF NOT EXISTS daily_order_count integer
  CHECK (daily_order_count IS NULL OR daily_order_count >= 0);

CREATE TABLE IF NOT EXISTS public.branch_daily_targets (
  branch text NOT NULL,
  target_date date NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch, target_date)
);

ALTER TABLE public.branch_daily_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_targets_admin_manage ON public.branch_daily_targets;
CREATE POLICY daily_targets_admin_manage
  ON public.branch_daily_targets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS daily_targets_read_assigned_branches ON public.branch_daily_targets;
CREATE POLICY daily_targets_read_assigned_branches
  ON public.branch_daily_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_branch_access a WHERE a.user_id = auth.uid() AND a.branch = branch_daily_targets.branch)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_daily_targets TO authenticated;
