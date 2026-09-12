import { apiFetch, handleApiResponse } from "./client";
import { supabase } from "../supabase";
import { normalizeStaffRole } from "../staff-roles";
import {
  setDoctorMetadata,
  getDoctorMetadata,
  isStaffDeletedLocally,
  markStaffAsDeletedLocally,
  unmarkStaffAsDeletedLocally,
  removeDoctorMetadata,
} from "../doctor-metadata";

export interface StaffAccount {
  id: string | number;
  username: string;
  role: string;
  displayName: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
  specialty?: string;
  experience?: string;
  /** Numeric years of experience stored in the doctors.experience_years column */
  experienceYears?: number | null;
  bio?: string;
}

export interface CreateStaffData {
  username: string;
  password: string;
  role: string;
  displayName: string;
  isActive: boolean;
  specialty?: string;
  experience?: string;
  /** Numeric value sent to doctors.experience_years */
  experienceYears?: number | null;
  bio?: string;
}

export interface UpdateStaffData {
  username: string;
  role: string;
  displayName: string;
  isActive: boolean;
  specialty?: string;
  experience?: string;
  /** Numeric value sent to doctors.experience_years */
  experienceYears?: number | null;
  bio?: string;
}

export interface ResetPasswordData {
  newPassword: string;
  username?: string;
}

export interface ToggleStatusData {
  isActive?: boolean;
}

function isDoctorRole(role?: string | null): boolean {
  return normalizeStaffRole(role) === "doctor" || role?.toLowerCase() === "doctor";
}

function canonicalRole(role: string): string {
  return normalizeStaffRole(role) || role.toLowerCase().trim();
}

function parseRpcPayload(result: unknown): { success?: boolean; data?: any; error?: string; message?: string } {
  if (!result) return {};
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }
  return result as any;
}

function mapStaffRow(account: any, profile?: { specialty?: string; experience?: string; bio?: string }): StaffAccount {
  const username = account.username || account.userName;
  const role = account.role;
  const meta = getDoctorMetadata(username);
  const doctor = isDoctorRole(role);
  return {
    id: account.id != null ? account.id.toString() : "",
    username,
    role,
    displayName: account.display_name ?? account.displayName ?? null,
    isActive: account.is_active !== undefined ? Boolean(account.is_active) : Boolean(account.isActive),
    isOnline: Boolean(account.is_online ?? account.isOnline),
    lastSeen: account.last_seen ?? account.lastSeen ?? null,
    createdAt: account.created_at ?? account.createdAt ?? new Date().toISOString(),
    updatedAt: account.updated_at ?? account.updatedAt ?? new Date().toISOString(),
    specialty: profile?.specialty || meta?.specialty || undefined,
    experience: profile?.experience || meta?.experience || undefined,
    bio: profile?.bio || meta?.bio,
  };
}

async function fetchDoctorProfiles(): Promise<Map<string, { specialty?: string; experience?: string; bio?: string }>> {
  const map = new Map<string, { specialty?: string; experience?: string; bio?: string }>();
  const { data, error } = await supabase
    .from("doctors")
    .select("username, specialty, experience, bio");
  if (error || !data) return map;
  for (const row of data) {
    if (row?.username) {
      map.set(String(row.username).toLowerCase(), {
        specialty: row.specialty,
        experience: row.experience,
        bio: row.bio,
      });
    }
  }
  return map;
}

async function persistDoctorProfile(
  username: string,
  data: { specialty?: string; experience?: string; experienceYears?: number | null; bio?: string }
): Promise<void> {
  const cleanUsername = username.toLowerCase().trim();
  setDoctorMetadata(cleanUsername, { specialty: data.specialty, experience: data.experience, bio: data.bio });

  // Build a display string from the numeric value when available
  const experienceStr =
    data.experienceYears != null
      ? data.experienceYears >= 30
        ? "30+ years experience"
        : `${data.experienceYears}+ years experience`
      : data.experience || "5+ years experience";

  const payload: Record<string, any> = {
    username: cleanUsername,
    specialty: data.specialty || "General Practice",
    experience: experienceStr,
    bio: data.bio || "",
    is_available: true,
    updated_at: new Date().toISOString(),
  };

  // Write the numeric column only when a real value is provided
  if (data.experienceYears != null) {
    payload.experience_years = data.experienceYears;
  }

  const { error: tableError } = await supabase.from("doctors").upsert(payload, { onConflict: "username" });
  if (!tableError) return;

  const { error: rpcError } = await supabase.rpc("upsert_doctor_profile", {
    p_username: cleanUsername,
    p_specialty: payload.specialty,
    p_experience: payload.experience,
    p_bio: payload.bio,
  });
  if (rpcError) {
    console.warn("[Staff API] Doctor profile persist skipped:", tableError.message || rpcError.message);
  }
}

async function fetchStaffByUsername(username: string): Promise<any | null> {
  const { data } = await supabase
    .from("staff_accounts")
    .select("id, username, role, display_name, is_active, is_online, last_seen, created_at, updated_at")
    .ilike("username", username.trim())
    .maybeSingle();
  return data || null;
}

/**
 * GET /api/staff
 * Fetch all staff accounts (Express/Prisma first — same DB login uses).
 * Supabase anon reads are RLS-limited and can hide admin creates/updates.
 */
export const getAllStaffAccounts = async (): Promise<StaffAccount[]> => {
  let rows: any[] | null = null;

  // 1) Express first so Admin UI matches login/create/update
  try {
    const response = await apiFetch("/api/staff", { method: "GET" });
    const result = await handleApiResponse<{ success: boolean; staff: StaffAccount[]; count: number }>(response);
    if (Array.isArray(result.staff)) {
      rows = result.staff;
    }
  } catch (apiErr) {
    console.warn("[Staff API] Express getAllStaff failed, trying Supabase:", apiErr);
  }

  // 2) Supabase fallback only if Express is unreachable
  if (!rows) {
    const { data, error } = await supabase
      .from("staff_accounts")
      .select("id, username, role, display_name, is_active, is_online, last_seen, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (!error && data) {
      rows = data;
    } else {
      console.error("[Staff API] Supabase fetch error:", error);
      return [];
    }
  }

  const profiles = await fetchDoctorProfiles();

  return (rows || [])
    .filter(
      (account: any) =>
        account.role?.toUpperCase() !== "DELETED" &&
        account.username !== "[DELETED]" &&
        !isStaffDeletedLocally(account.id, account.username)
    )
    .map((account: any) => mapStaffRow(account, profiles.get(String(account.username || "").toLowerCase())));
};

/**
 * POST /api/staff
 * Create a new staff account.
 * Login uses Render/Express — create MUST write password_hash through that same path
 * or the new account will show in Admin but return 401 on /api/auth/login.
 */
export const createStaffAccount = async (data: CreateStaffData): Promise<StaffAccount> => {
  const role = canonicalRole(data.role);
  const cleanUsername = data.username.toLowerCase().trim();
  const displayName = data.displayName.trim();
  const isActive = data.isActive !== undefined ? data.isActive : true;

  unmarkStaffAsDeletedLocally(cleanUsername);

  let created: any = null;
  let lastError = "";

  // 1) Express first — same bcrypt hash path that login verifies
  try {
    const response = await apiFetch("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        username: cleanUsername,
        password: data.password,
        role,
        displayName,
        isActive,
        specialty: data.specialty,
        experience: data.experience,
        experienceYears: data.experienceYears,
        bio: data.bio,
      }),
    });
    const result = await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
    created = result.data;
  } catch (apiErr: any) {
    lastError = apiErr?.message || "Failed to create login account on the server";
    console.warn("[Staff API] Express createStaff failed:", apiErr);
    const msg = String(lastError).toLowerCase();
    if (
      msg.includes("insufficient permissions") ||
      msg.includes("access denied") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      throw new Error(
        "Access denied while creating staff. Sign out, sign in again as admin, then retry."
      );
    }
  }

  // Do not fall back to the missing Supabase RPC (404). Express is the source of truth for login.
  if (!created) {
    throw new Error(
      lastError ||
        "Staff account was not saved. Sign in as admin again, then create the account."
    );
  }

  // Prefer Express response so Admin list stays in sync even when Supabase anon RLS hides the row
  const verified = created || (await fetchStaffByUsername(cleanUsername));
  if (!verified || (!verified.id && !verified.username)) {
    throw new Error(
      lastError ||
        "Staff account was not saved. Sign in as admin again, then create the account."
    );
  }

  if (role === "doctor") {
    await persistDoctorProfile(cleanUsername, {
      specialty: data.specialty,
      experience: data.experience,
      experienceYears: data.experienceYears,
      bio: data.bio,
    });
  }

  const profiles = await fetchDoctorProfiles();
  return mapStaffRow(verified, profiles.get(cleanUsername));
};

/**
 * PUT /api/staff/:id
 * Update staff account details.
 * Login uses Render/Express — username changes MUST go through Express
 * or Admin will show the new username while /api/auth/login still uses the old one.
 */
export const updateStaffAccount = async (id: string | number, data: UpdateStaffData): Promise<StaffAccount> => {
  const cleanUsername = data.username.toLowerCase().trim();
  const role = canonicalRole(data.role);
  let previousUsername = "";

  // Capture previous username (for doctor profile rename cleanup)
  try {
    const existing = await getAllStaffAccounts();
    const match = existing.find((s) => String(s.id) === String(id));
    previousUsername = match?.username?.toLowerCase() || "";
  } catch {
    // non-critical
  }

  let updated: any = null;
  try {
    const response = await apiFetch(`/api/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        username: cleanUsername,
        role,
        displayName: data.displayName.trim(),
        isActive: data.isActive,
        specialty: data.specialty,
        experience: data.experience,
        experienceYears: data.experienceYears,
        bio: data.bio,
      }),
    });
    const result = await handleApiResponse<{ success: boolean; data: StaffAccount }>(response);
    updated = result.data;
  } catch (apiErr: any) {
    const msg = String(apiErr?.message || "").toLowerCase();
    if (
      msg.includes("insufficient permissions") ||
      msg.includes("access denied") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      throw new Error(
        "Access denied while updating staff. Sign out, sign in again as admin, then retry."
      );
    }
    throw new Error(apiErr?.message || "Failed to update staff account on the server.");
  }

  if (!updated) {
    throw new Error("Failed to update staff account in the database.");
  }

  // Prefer Express response — do not re-read stale Supabase anon cache
  const verified = updated;

  if (role === "doctor") {
    // If username changed, remove old doctors profile row so public page updates
    if (previousUsername && previousUsername !== cleanUsername) {
      await supabase.from("doctors").delete().ilike("username", previousUsername);
      removeDoctorMetadata(previousUsername);
    }
    await persistDoctorProfile(cleanUsername, {
      specialty: data.specialty,
      experience: data.experience,
      experienceYears: data.experienceYears,
      bio: data.bio,
    });
  }

  const profiles = await fetchDoctorProfiles();
  return mapStaffRow(verified, profiles.get(cleanUsername));
};

/**
 * PUT /api/staff/:id/password
 * Reset staff password
 */
export const resetStaffPassword = async (id: string | number, data: ResetPasswordData): Promise<void> => {
  const targetStr = String(id).trim();
  const numId = parseInt(targetStr, 10);
  const lookup = data.username?.trim() || (!isNaN(numId) ? "" : targetStr);
  let lastError = "";

  // Login uses Render/Express. That write must succeed before the UI reports success.
  try {
    const response = await apiFetch(`/api/staff/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({
        newPassword: data.newPassword,
        username: lookup || undefined,
      }),
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
    return;
  } catch (apiErr: any) {
    lastError = apiErr?.message || "Failed to update login password on the server";
    console.warn("[Staff API] Express resetPassword failed:", apiErr);
  }

  const msg = String(lastError).toLowerCase();
  if (
    msg.includes("insufficient permissions") ||
    msg.includes("access denied") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden")
  ) {
    throw new Error(
      "Access denied while resetting password. Sign out, sign in again as admin, then retry."
    );
  }

  throw new Error(
    lastError ||
      "Password reset did not update the login account. Sign in as admin again, then reset."
  );
};

/**
 * PATCH /api/staff/:id/status
 * Toggle staff active status
 */
export const toggleStaffStatus = async (id: string | number, data?: ToggleStatusData): Promise<StaffAccount> => {
  try {
    const response = await apiFetch(`/api/staff/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data || {}),
    });
    const result = await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
    return result.data;
  } catch (apiErr: any) {
    const msg = String(apiErr?.message || "").toLowerCase();
    if (
      msg.includes("insufficient permissions") ||
      msg.includes("access denied") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      throw new Error(
        "Access denied while updating status. Sign out, sign in again as admin, then retry."
      );
    }
    throw new Error(apiErr?.message || "Failed to update staff status on the server.");
  }
};

/**
 * DELETE /api/staff/:id
 * Delete staff account with cascading cleanup
 */
export const deleteStaffAccount = async (id: string | number, username?: string): Promise<void> => {
  const targetStr = String(id).trim();
  const lookup = username?.trim() || "";

  try {
    const response = await apiFetch(`/api/staff/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ username: lookup || undefined }),
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
  } catch (apiErr: any) {
    const lastError = apiErr?.message || "Failed to delete staff on the login server";
    if (/last active admin/i.test(lastError)) {
      throw new Error(lastError);
    }
    const msg = String(lastError).toLowerCase();
    if (
      msg.includes("insufficient permissions") ||
      msg.includes("access denied") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      throw new Error(
        "Access denied while deleting staff. Sign out, sign in again as admin, then retry."
      );
    }
    throw new Error(lastError);
  }

  // Best-effort public profile cleanup (does not affect login DB)
  if (lookup) {
    await supabase.from("doctors").delete().ilike("username", lookup);
  }

  markStaffAsDeletedLocally(targetStr, lookup || undefined);
  if (lookup) removeDoctorMetadata(lookup);
  removeDoctorMetadata(targetStr);
};
