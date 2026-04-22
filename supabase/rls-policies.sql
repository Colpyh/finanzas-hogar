-- ============================================================
-- finanzas-hogar — RLS Policies
-- Apply this via Supabase SQL editor or as a Drizzle migration
-- ============================================================

-- ============================================================
-- Helper function: is_household_member
-- SECURITY DEFINER + STABLE: runs as owner, cacheable per-tx
-- Avoids RLS recursion on household_member table
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_household_member(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_member
    WHERE household_id = hh_id
      AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.household              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_member       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invite       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_payment  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- household
-- ============================================================
CREATE POLICY "household_select" ON public.household
  FOR SELECT USING (is_household_member(id));

CREATE POLICY "household_insert" ON public.household
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "household_update" ON public.household
  FOR UPDATE USING (is_household_member(id));

-- No DELETE: households are never deleted in Phase 1

-- ============================================================
-- household_member
-- ============================================================
CREATE POLICY "household_member_select" ON public.household_member
  FOR SELECT USING (is_household_member(household_id));

-- Only allow self-insert: onboarding creates own row, invite redemption creates own row
CREATE POLICY "household_member_insert" ON public.household_member
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No UPDATE/DELETE: membership changes are out of Phase 1 scope

-- ============================================================
-- household_invite
-- ============================================================
-- Members can see their household's invites
CREATE POLICY "household_invite_select_member" ON public.household_invite
  FOR SELECT USING (is_household_member(household_id));

-- Public read for invite redemption (unauthenticated users preview invite before joining)
CREATE POLICY "household_invite_select_by_token" ON public.household_invite
  FOR SELECT USING (
    redeemed_at IS NULL
    AND expires_at > now()
  );

CREATE POLICY "household_invite_insert" ON public.household_invite
  FOR INSERT WITH CHECK (
    is_household_member(household_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "household_invite_update" ON public.household_invite
  FOR UPDATE USING (is_household_member(household_id));

-- ============================================================
-- category
-- ============================================================
-- System categories (household_id IS NULL) visible to all authenticated users
CREATE POLICY "category_select" ON public.category
  FOR SELECT USING (
    household_id IS NULL
    OR is_household_member(household_id)
  );

CREATE POLICY "category_insert" ON public.category
  FOR INSERT WITH CHECK (
    household_id IS NOT NULL
    AND is_household_member(household_id)
  );

CREATE POLICY "category_update" ON public.category
  FOR UPDATE USING (
    household_id IS NOT NULL
    AND is_household_member(household_id)
  );

CREATE POLICY "category_delete" ON public.category
  FOR DELETE USING (
    household_id IS NOT NULL
    AND is_household_member(household_id)
  );

-- ============================================================
-- expense
-- ============================================================
CREATE POLICY "expense_select" ON public.expense
  FOR SELECT USING (
    is_household_member(household_id)
    AND (NOT is_private OR created_by = auth.uid())
  );

CREATE POLICY "expense_insert" ON public.expense
  FOR INSERT WITH CHECK (
    is_household_member(household_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "expense_update" ON public.expense
  FOR UPDATE USING (is_household_member(household_id));

-- Only creator can soft-delete their own expense (Scenario 6.3)
CREATE POLICY "expense_delete" ON public.expense
  FOR DELETE USING (
    is_household_member(household_id)
    AND created_by = auth.uid()
  );

-- ============================================================
-- fixed_expense_payment
-- ============================================================
CREATE POLICY "fixed_payment_select" ON public.fixed_expense_payment
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "fixed_payment_insert" ON public.fixed_expense_payment
  FOR INSERT WITH CHECK (
    is_household_member(household_id)
    AND paid_by = auth.uid()
  );

CREATE POLICY "fixed_payment_update" ON public.fixed_expense_payment
  FOR UPDATE USING (is_household_member(household_id));

CREATE POLICY "fixed_payment_delete" ON public.fixed_expense_payment
  FOR DELETE USING (
    is_household_member(household_id)
    AND paid_by = auth.uid()
  );

-- ============================================================
-- updated_at trigger (safety net alongside Drizzle $onUpdate)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER expense_updated_at
  BEFORE UPDATE ON public.expense
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- pending_expense RLS
-- ============================================================
ALTER TABLE public.pending_expense ENABLE ROW LEVEL SECURITY;

-- Members of the household can SELECT their pending rows
CREATE POLICY "pending_expense_select" ON public.pending_expense
  FOR SELECT
  USING (is_household_member(household_id));

-- Members can UPDATE status / expense_id on their pending rows
CREATE POLICY "pending_expense_update" ON public.pending_expense
  FOR UPDATE
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- NO INSERT policy: webhook uses service-role client, which bypasses RLS.
-- NO DELETE policy: discard is soft (status='discarded') — preserves audit trail.
