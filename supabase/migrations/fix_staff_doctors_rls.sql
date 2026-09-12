-- Persist staff/doctors on hosted Supabase (admin create was succeeding in the UI
-- without inserting a row when RLS blocked table writes).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id            bigserial PRIMARY KEY,
  username      text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  role          text        NOT NULL,
  display_name  text,
  is_active     boolean     NOT NULL DEFAULT true,
  is_online     boolean     DEFAULT false,
  last_seen     timestamptz,
  last_login    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS last_seen timestamptz;

CREATE TABLE IF NOT EXISTS public.doctors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  department_id text,
  specialty     text NOT NULL DEFAULT 'General Practice',
  experience    text DEFAULT '5+ years experience',
  bio           text DEFAULT 'Specialist physician at Dr. Amanuel Hospital.',
  is_available  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_staff_accounts ON public.staff_accounts;
CREATE POLICY anon_select_staff_accounts ON public.staff_accounts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_insert_staff_accounts ON public.staff_accounts;
CREATE POLICY anon_insert_staff_accounts ON public.staff_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_staff_accounts ON public.staff_accounts;
CREATE POLICY anon_update_staff_accounts ON public.staff_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_delete_staff_accounts ON public.staff_accounts;
CREATE POLICY anon_delete_staff_accounts ON public.staff_accounts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_select_doctors ON public.doctors;
CREATE POLICY anon_select_doctors ON public.doctors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_insert_doctors ON public.doctors;
CREATE POLICY anon_insert_doctors ON public.doctors FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_doctors ON public.doctors;
CREATE POLICY anon_update_doctors ON public.doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_delete_doctors ON public.doctors;
CREATE POLICY anon_delete_doctors ON public.doctors FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.normalize_hospital_role(p_role text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := lower(trim(coalesce(p_role, '')));
  v_role := replace(replace(v_role, ' ', '_'), '-', '_');

  IF v_role IN ('administrator') THEN
    RETURN 'admin';
  ELSIF v_role IN ('receptionist') THEN
    RETURN 'reception';
  ELSIF v_role IN ('pharmacist') THEN
    RETURN 'pharmacy';
  ELSIF v_role IN ('lab', 'lab_tech', 'labtech') THEN
    RETURN 'laboratory';
  END IF;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_staff_account(
  p_username text,
  p_password text,
  p_role text,
  p_display_name text,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.staff_accounts%ROWTYPE;
  v_role text;
BEGIN
  v_role := public.normalize_hospital_role(p_role);

  IF EXISTS (SELECT 1 FROM public.staff_accounts WHERE username = lower(trim(p_username))) THEN
    RETURN json_build_object('success', false, 'error', 'Username already exists');
  END IF;

  IF v_role NOT IN ('admin', 'reception', 'cashier', 'doctor', 'laboratory', 'pharmacy', 'staff') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role specified');
  END IF;

  INSERT INTO public.staff_accounts (username, password_hash, role, display_name, is_active, is_online)
  VALUES (
    lower(trim(p_username)),
    crypt(p_password, gen_salt('bf', 10)),
    v_role,
    p_display_name,
    COALESCE(p_is_active, true),
    false
  )
  RETURNING * INTO v_account;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id', v_account.id,
      'username', v_account.username,
      'role', v_account.role,
      'display_name', v_account.display_name,
      'is_active', v_account.is_active,
      'is_online', v_account.is_online,
      'created_at', v_account.created_at,
      'updated_at', v_account.updated_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_account(
  p_id bigint,
  p_username text,
  p_role text,
  p_display_name text,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.staff_accounts%ROWTYPE;
  v_role text;
BEGIN
  v_role := public.normalize_hospital_role(p_role);

  SELECT * INTO v_account FROM public.staff_accounts WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Staff account not found');
  END IF;

  IF lower(trim(p_username)) != v_account.username AND
     EXISTS (SELECT 1 FROM public.staff_accounts WHERE username = lower(trim(p_username)) AND id != p_id) THEN
    RETURN json_build_object('success', false, 'error', 'Username already exists');
  END IF;

  IF v_role NOT IN ('admin', 'reception', 'cashier', 'doctor', 'laboratory', 'pharmacy', 'staff') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role specified');
  END IF;

  UPDATE public.staff_accounts
  SET username = lower(trim(p_username)),
      role = v_role,
      display_name = p_display_name,
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_account;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id', v_account.id,
      'username', v_account.username,
      'role', v_account.role,
      'display_name', v_account.display_name,
      'is_active', v_account.is_active,
      'updated_at', v_account.updated_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff_account(p_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.staff_accounts%ROWTYPE;
  v_admin_count int;
BEGIN
  SELECT * INTO v_account FROM public.staff_accounts WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Staff account not found');
  END IF;

  IF public.normalize_hospital_role(v_account.role) = 'admin' AND v_account.is_active = true THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.staff_accounts
    WHERE public.normalize_hospital_role(role) = 'admin' AND is_active = true;

    IF v_admin_count <= 1 THEN
      RETURN json_build_object('success', false, 'error', 'Cannot delete the last active admin account');
    END IF;
  END IF;

  DELETE FROM public.doctors WHERE lower(username) = lower(v_account.username);
  DELETE FROM public.staff_accounts WHERE id = p_id;

  RETURN json_build_object('success', true, 'message', 'Staff account deleted successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_doctor_profile(
  p_username text,
  p_specialty text,
  p_experience text,
  p_bio text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.doctors (username, specialty, experience, bio, is_available, updated_at)
  VALUES (
    lower(trim(p_username)),
    COALESCE(NULLIF(trim(p_specialty), ''), 'General Practice'),
    COALESCE(NULLIF(trim(p_experience), ''), '5+ years experience'),
    COALESCE(p_bio, ''),
    true,
    now()
  )
  ON CONFLICT (username) DO UPDATE
  SET specialty = EXCLUDED.specialty,
      experience = EXCLUDED.experience,
      bio = EXCLUDED.bio,
      updated_at = now();

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_staff_password(
  p_id bigint,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.staff_accounts%ROWTYPE;
BEGIN
  IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;

  SELECT * INTO v_account FROM public.staff_accounts WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Staff account not found');
  END IF;

  UPDATE public.staff_accounts
  SET password_hash = crypt(trim(p_new_password), gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_account;

  RETURN json_build_object('success', true, 'message', 'Password reset successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_hospital_role(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_account(text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_account(bigint, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_account(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_staff_password(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_doctor_profile(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_staff_accounts() TO anon, authenticated;
