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
    specialty: profile?.specialty || meta?.specialty || (doctor ? "General Practice" : undefined),
    experience: profile?.experience || meta?.experience || (doctor ? "5+ years" : undefined),
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
 * Fetch all staff accounts
 */
export const getAllStaffAccounts = async (): Promise<StaffAccount[]> => {
  let rows: any[] | null = null;

  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, username, role, display_name, is_active, is_online, last_seen, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (!error && data) {
    rows = data;
  } else {
    console.error("[Staff API] Supabase fetch error:", error);
    const { data: rpcResult, error: rpcError } = await supabase.rpc("get_all_staff_accounts");
    const parsed = parseRpcPayload(rpcResult);
    if (!rpcError && parsed.success && Array.isArray(parsed.data)) {
      rows = parsed.data;
    } else {
      try {
        const response = await apiFetch("/api/staff", { method: "GET" });
        const result = await handleApiResponse<{ success: boolean; staff: StaffAccount[]; count: number }>(response);
        if (result.staff) {
          return result.staff.filter((s: any) => s.role?.toUpperCase() !== "DELETED");
        }
      } catch {
        return [];
      }
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
 * Create a new staff account. Never report success unless a DB row exists.
 */
export const createStaffAccount = async (data: CreateStaffData): Promise<StaffAccount> => {
  const role = canonicalRole(data.role);
  const cleanUsername = data.username.toLowerCase().trim();
  const displayName = data.displayName.trim();
  const isActive = data.isActive !== undefined ? data.isActive : true;

  unmarkStaffAsDeletedLocally(cleanUsername);

  let created: any = null;
  let lastError = "";

  const { data: rpcResult, error: rpcError } = await supabase.rpc("create_staff_account", {
    p_username: cleanUsername,
    p_password: data.password,
    p_role: role,
    p_display_name: displayName,
    p_is_active: isActive,
  });
  const parsed = parseRpcPayload(rpcResult);
  if (!rpcError && parsed.success && parsed.data) {
    created = parsed.data;
  } else {
    lastError = parsed.error || rpcError?.message || "";
  }

  if (!created) {
    const insertPayload: any = {
      username: cleanUsername,
      password_hash: data.password,
      role,
      display_name: displayName,
      is_active: isActive,
    };
    const { data: inserted, error: sbError } = await supabase
      .from("staff_accounts")
      .insert(insertPayload)
      .select()
      .single();

    if (inserted) {
      created = inserted;
    } else {
      lastError = sbError?.message || lastError;
      if (
        sbError?.code === "23505" ||
        sbError?.message?.toLowerCase().includes("unique") ||
        sbError?.message?.toLowerCase().includes("duplicate") ||
        lastError.toLowerCase().includes("already exists")
      ) {
        throw new Error(`Username "${data.username}" is already taken. Please choose a different username.`);
      }
    }
  }

  if (!created) {
    try {
      const response = await apiFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({ ...data, role }),
      });
      const result = await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
      created = result.data;
    } catch (apiErr: any) {
      lastError = apiErr?.message || lastError;
    }
  }

  const verified = (await fetchStaffByUsername(cleanUsername)) || created;
  if (!verified || (!verified.id && !verified.username)) {
    throw new Error(
      lastError ||
        "Staff account was not saved to the database. Apply supabase/migrations/fix_staff_doctors_rls.sql in the hosted Supabase project, then try again."
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
 * Update staff account details
 */
export const updateStaffAccount = async (id: string | number, data: UpdateStaffData): Promise<StaffAccount> => {
  const cleanUsername = data.username.toLowerCase().trim();
  const role = canonicalRole(data.role);
  const targetStr = String(id).trim();
  const numId = parseInt(targetStr, 10);
  let updated: any = null;
  let lastError = "";

  if (!isNaN(numId)) {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("update_staff_account", {
      p_id: numId,
      p_username: cleanUsername,
      p_role: role,
      p_display_name: data.displayName.trim(),
      p_is_active: data.isActive,
    });
    const parsed = parseRpcPayload(rpcResult);
    if (!rpcError && parsed.success && parsed.data) {
      updated = parsed.data;
    } else {
      lastError = parsed.error || rpcError?.message || "";
    }
  }

  if (!updated) {
    const updatePayload: any = {
      username: cleanUsername,
      role,
      display_name: data.displayName.trim(),
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };
    let query = supabase.from("staff_accounts").update(updatePayload);
    query = !isNaN(numId) ? query.eq("id", numId) : query.ilike("username", targetStr);
    const { data: row, error } = await query.select().single();
    if (row) updated = row;
    else lastError = error?.message || lastError;
  }

  if (!updated) {
    try {
      const response = await apiFetch(`/api/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...data, role }),
      });
      const result = await handleApiResponse<{ success: boolean; data: StaffAccount }>(response);
      updated = result.data;
    } catch (apiErr: any) {
      lastError = apiErr?.message || lastError;
    }
  }

  const verified = (await fetchStaffByUsername(cleanUsername)) || updated;
  if (!verified) {
    throw new Error(lastError || "Failed to update staff account in the database.");
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
 * PUT /api/staff/:id/password
 * Reset staff password
 */
export const resetStaffPassword = async (id: string | number, data: ResetPasswordData): Promise<void> => {
  const targetStr = String(id).trim();
  const numId = parseInt(targetStr, 10);

  if (!isNaN(numId)) {
    const { data: rpcResult, error } = await supabase.rpc("reset_staff_password", {
      p_id: numId,
      p_new_password: data.newPassword,
    });
    const parsed = parseRpcPayload(rpcResult);
    if (!error && parsed.success) return;
  }

  try {
    const response = await apiFetch(`/api/staff/${id}/password`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
    return;
  } catch (apiErr) {
    console.warn("[Staff API] Express API resetPassword failed, using Supabase fallback:", apiErr);
  }

  let query = supabase.from("staff_accounts").update({ password_hash: data.newPassword });
  if (!isNaN(numId)) {
    query = query.eq("id", numId);
  } else {
    query = query.ilike("username", targetStr);
  }
  const { error } = await query;
  if (error) throw new Error(error.message || "Failed to reset password");
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
  } catch (apiErr) {
    console.warn("[Staff API] Express API toggleStatus failed, using Supabase fallback:", apiErr);
    const targetStr = String(id).trim();
    const numId = parseInt(targetStr, 10);

    if (!isNaN(numId)) {
      const { data: rpcResult, error } = await supabase.rpc("toggle_staff_account_status", { p_id: numId });
      const parsed = parseRpcPayload(rpcResult);
      if (!error && parsed.success && parsed.data) {
        return mapStaffRow(parsed.data);
      }
    }

    let query = supabase.from("staff_accounts").select("is_active");
    if (!isNaN(numId)) query = query.eq("id", numId);
    else query = query.ilike("username", targetStr);

    const { data: existing } = await query.single();
    const newStatus = data?.isActive !== undefined ? data.isActive : existing ? !existing.is_active : true;

    let updateQuery = supabase.from("staff_accounts").update({ is_active: newStatus });
    if (!isNaN(numId)) updateQuery = updateQuery.eq("id", numId);
    else updateQuery = updateQuery.ilike("username", targetStr);

    const { data: updated, error } = await updateQuery.select().single();
    if (error || !updated) throw new Error(error?.message || "Failed to update staff status");
    return mapStaffRow(updated);
  }
};

/**
 * DELETE /api/staff/:id
 * Delete staff account with cascading cleanup
 */
export const deleteStaffAccount = async (id: string | number, username?: string): Promise<void> => {
  const targetStr = String(id).trim();
  const numId = parseInt(targetStr, 10);
  let deleted = false;
  let lastError = "";

  if (!isNaN(numId)) {
    const { data: rpcResult, error } = await supabase.rpc("delete_staff_account", { p_id: numId });
    const parsed = parseRpcPayload(rpcResult);
    if (!error && parsed.success) {
      deleted = true;
    } else {
      lastError = parsed.error || error?.message || "";
    }
  }

  if (!deleted) {
    try {
      const response = await apiFetch(`/api/staff/${id}`, { method: "DELETE" });
      await handleApiResponse<{ success: boolean; message: string }>(response);
      deleted = true;
    } catch (apiErr: any) {
      lastError = apiErr?.message || lastError;
    }
  }

  if (!deleted) {
    if (username) {
      await supabase.from("doctors").delete().ilike("username", username.trim());
    }
    if (!isNaN(numId)) {
      const { error } = await supabase.from("staff_accounts").delete().eq("id", numId);
      if (!error) deleted = true;
      else lastError = error.message;
    }
    if (!deleted && username) {
      const { error } = await supabase.from("staff_accounts").delete().ilike("username", username.trim());
      if (!error) deleted = true;
      else lastError = error.message;
    }
    if (!deleted) {
      const { error } = await supabase.from("staff_accounts").delete().ilike("username", targetStr);
      if (!error) deleted = true;
      else lastError = error.message;
    }
  }

  if (!deleted) {
    throw new Error(lastError || "Failed to delete staff account from the database.");
  }

  markStaffAsDeletedLocally(targetStr, username);
  if (username) removeDoctorMetadata(username);
  removeDoctorMetadata(targetStr);
};
