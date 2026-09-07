import { apiFetch, handleApiResponse } from "./client";
import { supabase } from "../supabase";
import { setDoctorMetadata, getDoctorMetadata, isStaffDeletedLocally, markStaffAsDeletedLocally, unmarkStaffAsDeletedLocally, removeDoctorMetadata } from "../doctor-metadata";

// ══════════════════════════════════════════════════════════════════════════════
// STAFF ACCOUNT TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
  bio?: string;
}

export interface UpdateStaffData {
  username: string;
  role: string;
  displayName: string;
  isActive: boolean;
  specialty?: string;
  experience?: string;
  bio?: string;
}

export interface ResetPasswordData {
  newPassword: string;
}

export interface ToggleStatusData {
  isActive?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS WITH SUPABASE FALLBACK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/staff
 * Fetch all staff accounts
 */
export const getAllStaffAccounts = async (): Promise<StaffAccount[]> => {
  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, username, role, display_name, is_active, is_online, last_seen, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Staff API] Supabase fetch error:", error);
    try {
      const response = await apiFetch("/api/staff", { method: "GET" });
      const result = await handleApiResponse<{ success: boolean; staff: StaffAccount[]; count: number }>(response);
      if (result.staff) return result.staff.filter((s: any) => s.role?.toUpperCase() !== "DELETED");
    } catch {
      return [];
    }
  }

  return (data || [])
    .filter(
      (account: any) =>
        account.role?.toUpperCase() !== "DELETED" &&
        account.username !== "[DELETED]" &&
        !isStaffDeletedLocally(account.id, account.username)
    )
    .map((account: any) => {
      const meta = getDoctorMetadata(account.username);
      const isDoctor = account.role?.toUpperCase() === "DOCTOR";
      return {
        id: account.id.toString(),
        username: account.username,
        role: account.role,
        displayName: account.display_name,
        isActive: Boolean(account.is_active),
        isOnline: Boolean(account.is_online),
        lastSeen: account.last_seen,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        // localStorage metadata (set when admin creates/edits doctor) > defaults
        specialty: meta?.specialty || (isDoctor ? "General Practice" : undefined),
        experience: meta?.experience || (isDoctor ? "5+ years" : undefined),
        bio: meta?.bio,
      };
    });
};

/**
 * POST /api/staff
 * Create a new staff account directly in Supabase
 */
export const createStaffAccount = async (data: CreateStaffData): Promise<StaffAccount> => {
  const roleUpper = data.role.toUpperCase();
  const cleanUsername = data.username.toLowerCase().trim();

  unmarkStaffAsDeletedLocally(cleanUsername);

  if (data.specialty || data.experience || data.bio) {
    setDoctorMetadata(cleanUsername, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  // Primary: Save directly to Supabase staff_accounts so public pages & realtime work on deployed & local
  const insertPayload: any = {
    username: cleanUsername,
    password_hash: data.password,
    role: roleUpper,
    display_name: data.displayName.trim(),
    is_active: data.isActive !== undefined ? data.isActive : true,
  };

  const { data: created, error: sbError } = await supabase
    .from("staff_accounts")
    .upsert(insertPayload, { onConflict: "username" })
    .select()
    .single();

  if (sbError) {
    console.error("[Staff API] Supabase account creation error:", sbError);
    if (
      sbError.code === "23505" ||
      sbError.message?.toLowerCase().includes("unique") ||
      sbError.message?.toLowerCase().includes("duplicate")
    ) {
      throw new Error(`Username "${data.username}" is already taken. Please choose a different username.`);
    }
  }

  // Secondary: Attempt Express backend sync if available
  try {
    const response = await apiFetch("/api/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
  } catch (apiErr) {
    console.log("[Staff API] Express API creation skipped/unavailable, Supabase active");
  }

  const finalUsername = created?.username || cleanUsername;
  if (roleUpper === "DOCTOR" && (data.specialty || data.experience || data.bio)) {
    setDoctorMetadata(finalUsername, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  return {
    id: created?.id ? created.id.toString() : Date.now().toString(),
    username: finalUsername,
    role: created?.role || roleUpper,
    displayName: created?.display_name || data.displayName,
    isActive: created?.is_active !== undefined ? Boolean(created.is_active) : data.isActive,
    isOnline: Boolean(created?.is_online),
    lastSeen: created?.last_seen || null,
    createdAt: created?.created_at || new Date().toISOString(),
    updatedAt: created?.updated_at || new Date().toISOString(),
    specialty: data.specialty,
    experience: data.experience,
    bio: data.bio,
  };
};

/**
 * PUT /api/staff/:id
 * Update staff account details directly in Supabase
 */
export const updateStaffAccount = async (id: string | number, data: UpdateStaffData): Promise<StaffAccount> => {
  const cleanUsername = data.username.toLowerCase().trim();

  if (data.specialty || data.experience || data.bio) {
    setDoctorMetadata(cleanUsername, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  const targetStr = String(id).trim();
  const numId = parseInt(targetStr, 10);

  const updatePayload: any = {
    username: cleanUsername,
    role: data.role.toUpperCase(),
    display_name: data.displayName.trim(),
    is_active: data.isActive,
  };

  let query = supabase.from("staff_accounts").update(updatePayload);
  if (!isNaN(numId)) {
    query = query.eq("id", numId);
  } else {
    query = query.ilike("username", targetStr);
  }

  const { data: updated } = await query.select().single();

  try {
    await apiFetch(`/api/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  } catch (apiErr) {
    console.log("[Staff API] Express update skipped/unavailable");
  }

  const finalUsername = updated?.username || cleanUsername;
  if (data.role?.toUpperCase() === "DOCTOR" && (data.specialty !== undefined || data.experience !== undefined || data.bio !== undefined)) {
    setDoctorMetadata(finalUsername, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  return {
    id: updated?.id ? updated.id.toString() : String(id),
    username: finalUsername,
    role: updated?.role || data.role,
    displayName: updated?.display_name || data.displayName,
    isActive: updated?.is_active !== undefined ? Boolean(updated.is_active) : data.isActive,
    isOnline: Boolean(updated?.is_online),
    lastSeen: updated?.last_seen || null,
    createdAt: updated?.created_at || new Date().toISOString(),
    updatedAt: updated?.updated_at || new Date().toISOString(),
    specialty: data.specialty,
    experience: data.experience,
    bio: data.bio,
  };
};

/**
 * PUT /api/staff/:id/password
 * Reset staff password
 */
export const resetStaffPassword = async (id: string | number, data: ResetPasswordData): Promise<void> => {
  try {
    const response = await apiFetch(`/api/staff/${id}/password`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
  } catch (apiErr) {
    console.warn("[Staff API] Express API resetPassword failed, using Supabase fallback:", apiErr);
    const targetStr = String(id).trim();
    const numId = parseInt(targetStr, 10);

    if (!isNaN(numId)) {
      await supabase.from("staff_accounts").update({ password_hash: data.newPassword }).eq("id", numId);
    } else {
      await supabase.from("staff_accounts").update({ password_hash: data.newPassword }).ilike("username", targetStr);
    }
  }
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

    let query = supabase.from("staff_accounts").select("is_active");
    if (!isNaN(numId)) query = query.eq("id", numId);
    else query = query.ilike("username", targetStr);

    const { data: existing } = await query.single();
    const newStatus = data?.isActive !== undefined ? data.isActive : existing ? !existing.is_active : true;

    let updateQuery = supabase.from("staff_accounts").update({ is_active: newStatus });
    if (!isNaN(numId)) updateQuery = updateQuery.eq("id", numId);
    else updateQuery = updateQuery.ilike("username", targetStr);

    const { data: updated, error } = await updateQuery.select().single();

    if (error || !updated) throw apiErr;

    return {
      id: updated.id.toString(),
      username: updated.username,
      role: updated.role,
      displayName: updated.display_name,
      isActive: Boolean(updated.is_active),
      isOnline: Boolean(updated.is_online),
      lastSeen: updated.last_seen,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
};

/**
 * DELETE /api/staff/:id
 * Delete staff account with cascading cleanup
 */
export const deleteStaffAccount = async (id: string | number, username?: string): Promise<void> => {
  const targetStr = String(id).trim();
  markStaffAsDeletedLocally(targetStr, username);
  if (username) removeDoctorMetadata(username);
  removeDoctorMetadata(targetStr);

  try {
    const response = await apiFetch(`/api/staff/${id}`, {
      method: "DELETE",
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
  } catch {
    // Express API unavailable — perform Supabase deletion and soft-delete updates
    const numId = parseInt(targetStr, 10);

    if (!isNaN(numId)) {
      await supabase.from("staff_accounts").delete().eq("id", numId);
      await supabase
        .from("staff_accounts")
        .update({ is_active: false, role: "DELETED", display_name: "[DELETED]" })
        .eq("id", numId);
    }

    if (username) {
      await supabase.from("staff_accounts").delete().ilike("username", username.trim());
      await supabase
        .from("staff_accounts")
        .update({ is_active: false, role: "DELETED", display_name: "[DELETED]" })
        .ilike("username", username.trim());
    }

    await supabase.from("staff_accounts").delete().ilike("username", targetStr);
    await supabase
      .from("staff_accounts")
      .update({ is_active: false, role: "DELETED", display_name: "[DELETED]" })
      .ilike("username", targetStr);
  }
};
