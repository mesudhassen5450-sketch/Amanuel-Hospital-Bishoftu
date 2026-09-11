-- ============================================================
-- DR. AMANUEL HOSPITAL - DOCTOR PROFILE COLUMNS MIGRATION
-- Adds experience_years, consultation_fee, rating, status
-- to the public.doctors table.
--
-- Run this once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Add new columns (safe to run multiple times via IF NOT EXISTS guards)
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS experience_years  integer,
  ADD COLUMN IF NOT EXISTS consultation_fee  numeric(10, 2),
  ADD COLUMN IF NOT EXISTS rating            numeric(3, 2),
  ADD COLUMN IF NOT EXISTS status            text DEFAULT 'active';

-- Useful indexes for future filtering
CREATE INDEX IF NOT EXISTS idx_doctors_status  ON public.doctors (status);
CREATE INDEX IF NOT EXISTS idx_doctors_rating  ON public.doctors (rating);

-- Update the upsert RPC to include the new columns so saves from the
-- admin form propagate them correctly even when the direct table write
-- is blocked by RLS and the app falls back to this function.
CREATE OR REPLACE FUNCTION public.upsert_doctor_profile(
  p_username        text,
  p_specialty       text,
  p_experience      text,
  p_bio             text,
  p_experience_years integer  DEFAULT NULL,
  p_consultation_fee numeric  DEFAULT NULL,
  p_rating           numeric  DEFAULT NULL,
  p_status           text     DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.doctors (
    username,
    specialty,
    experience,
    experience_years,
    consultation_fee,
    rating,
    status,
    bio,
    is_available,
    updated_at
  )
  VALUES (
    lower(trim(p_username)),
    COALESCE(NULLIF(trim(p_specialty), ''), 'General Practice'),
    COALESCE(NULLIF(trim(p_experience), ''), '5+ years experience'),
    p_experience_years,
    p_consultation_fee,
    p_rating,
    COALESCE(NULLIF(trim(p_status), ''), 'active'),
    COALESCE(p_bio, ''),
    true,
    now()
  )
  ON CONFLICT (username) DO UPDATE
  SET specialty         = EXCLUDED.specialty,
      experience        = EXCLUDED.experience,
      experience_years  = COALESCE(EXCLUDED.experience_years, public.doctors.experience_years),
      consultation_fee  = COALESCE(EXCLUDED.consultation_fee, public.doctors.consultation_fee),
      rating            = COALESCE(EXCLUDED.rating, public.doctors.rating),
      status            = COALESCE(EXCLUDED.status, public.doctors.status),
      bio               = EXCLUDED.bio,
      updated_at        = now();

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_doctor_profile(text, text, text, text, integer, numeric, numeric, text)
  TO anon, authenticated;

-- ============================================================
-- VERIFICATION (optional — uncomment to check after running)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'doctors'
-- ORDER BY ordinal_position;
-- ============================================================

-- ============================================================
-- FIX 401 "permission denied for table doctors"
--
-- RLS policies exist but the anon/authenticated roles were
-- never granted table-level privileges. In Postgres, RLS and
-- GRANT are independent: both must allow the operation.
-- ============================================================

-- Grant table-level privileges to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.doctors
  TO anon, authenticated;

-- Re-assert RLS is enabled (idempotent)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Re-create the SELECT policy explicitly (idempotent)
DROP POLICY IF EXISTS anon_select_doctors ON public.doctors;
CREATE POLICY anon_select_doctors
  ON public.doctors
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS anon_insert_doctors ON public.doctors;
CREATE POLICY anon_insert_doctors
  ON public.doctors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_doctors ON public.doctors;
CREATE POLICY anon_update_doctors
  ON public.doctors
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS anon_delete_doctors ON public.doctors;
CREATE POLICY anon_delete_doctors
  ON public.doctors
  FOR DELETE
  TO anon, authenticated
  USING (true);
