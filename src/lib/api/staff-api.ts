import { apiFetch, handleApiResponse } from "./client";
import { supabase } from "../supabase";
import { setDoctorMetadata, getDoctorMetadata } from "../doctor-metadata";

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
  try {
    const response = await apiFetch("/api/staff", { method: "GET" });
    const result = await handleApiResponse<{ success: boolean; staff: StaffAccount[]; count: number }>(response);
    if (result.staff) return result.staff.filter((s: any) => s.role?.toUpperCase() !== "DELETED");
  } catch (apiErr) {
    console.warn("[Staff API] Express API getAllStaff failed, using Supabase fallback:", apiErr);
  }

  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, username, role, display_name, is_active, is_online, last_seen, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Staff API] Supabase fallback error:", error);
    return [];
  }

  // Fetch doctor profiles from doctors table for additional metadata
  let doctorProfiles: Record<string, any> = {};
  try {
    const { data: docData } = await supabase
      .from("doctors")
      .select("username, specialty, experience, bio");
    if (docData) {
      for (const d of docData) {
        doctorProfiles[d.username?.toLowerCase()] = d;
      }
    }
  } catch {}

  return (data || [])
    .filter((account: any) => account.role?.toUpperCase() !== "DELETED" && account.username !== "[DELETED]")
    .map((account: any) => {
      const meta = getDoctorMetadata(account.username);
      const isDoctor = account.role?.toUpperCase() === "DOCTOR";
      const docProfile = doctorProfiles[account.username?.toLowerCase()];
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
        // DB (doctors table) > localStorage metadata > defaults
        specialty: docProfile?.specialty || meta?.specialty || (isDoctor ? "General Practice" : undefined),
        experience: docProfile?.experience || meta?.experience || (isDoctor ? "5+ years" : undefined),
        bio: docProfile?.bio || meta?.bio,
      };
    });
};

/**
 * POST /api/staff
 * Create a new staff account
 */
export const createStaffAccount = async (data: CreateStaffData): Promise<StaffAccount> => {
  if (data.specialty || data.experience || data.bio) {
    setDoctorMetadata(data.username, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  try {
    const response = await apiFetch("/api/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
    if (result.data) {
      if (data.specialty || data.experience || data.bio) {
        setDoctorMetadata(result.data.username || data.username, {
          specialty: data.specialty,
          experience: data.experience,
          bio: data.bio,
        });
      }
      return result.data;
    }
  } catch {
    // Express API unavailable (CORS / network) — use Supabase directly
    const roleUpper = data.role.toUpperCase();
    const insertPayload: any = {
      username: data.username.toLowerCase().trim(),
      password_hash: data.password,
      role: roleUpper,
      display_name: data.displayName.trim(),
      is_active: data.isActive !== undefined ? data.isActive : true,
    };

    const { data: created, error } = await supabase
      .from("staff_accounts")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !created) {
      console.error("[Staff API] Supabase account creation error:", error);
      // 23505 = unique_violation (username already exists)
      if (error?.code === "23505" || error?.message?.toLowerCase().includes("unique") || error?.message?.toLowerCase().includes("duplicate")) {
        throw new Error(`Username "${data.username}" is already taken. Please choose a different username.`);
      }
      throw new Error(error?.message || "Failed to create account. Please try again.");
    }

    // If doctor, also upsert into the doctors table for specialty/experience/bio
    if (roleUpper === "DOCTOR" && (data.specialty || data.experience || data.bio)) {
      try {
        await supabase.from("doctors").upsert({
          username: created.username,
          specialty: data.specialty || "General Practice",
          experience: data.experience,
          bio: data.bio,
        }, { onConflict: "username" });
      } catch (docErr) {
        console.warn("[Staff API] Could not upsert doctors record:", docErr);
      }
      setDoctorMetadata(created.username, {
        specialty: data.specialty,
        experience: data.experience,
        bio: data.bio,
      });
    }

    return {
      id: created.id.toString(),
      username: created.username,
      role: created.role,
      displayName: created.display_name,
      isActive: Boolean(created.is_active),
      isOnline: Boolean(created.is_online),
      lastSeen: created.last_seen,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    };
  }
};

/**
 * PUT /api/staff/:id
 * Update staff account details
 */
export const updateStaffAccount = async (id: string | number, data: UpdateStaffData): Promise<StaffAccount> => {
  if (data.specialty || data.experience || data.bio) {
    setDoctorMetadata(data.username, {
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    });
  }

  try {
    const response = await apiFetch(`/api/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const result = await handleApiResponse<{ success: boolean; data: StaffAccount; message: string }>(response);
    return result.data;
  } catch (apiErr) {
    console.warn("[Staff API] Express API updateStaff failed, using Supabase fallback:", apiErr);
    const targetStr = String(id).trim();
    const numId = parseInt(targetStr, 10);

    const updatePayload: any = {
      username: data.username.toLowerCase().trim(),
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

    const { data: updated, error } = await query.select().single();

    if (error || !updated) {
      throw apiErr;
    }

    // If doctor, also upsert the doctors table with profile info
    if (data.role?.toUpperCase() === "DOCTOR" && (data.specialty !== undefined || data.experience !== undefined || data.bio !== undefined)) {
      try {
        await supabase.from("doctors").upsert({
          username: updated.username,
          specialty: data.specialty || "General Practice",
          experience: data.experience,
          bio: data.bio,
        }, { onConflict: "username" });
      } catch (docErr) {
        console.warn("[Staff API] Could not update doctors record:", docErr);
      }
      setDoctorMetadata(updated.username, {
        specialty: data.specialty,
        experience: data.experience,
        bio: data.bio,
      });
    }

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
      specialty: data.specialty,
      experience: data.experience,
      bio: data.bio,
    };
  }
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
export const deleteStaffAccount = async (id: string | number): Promise<void> => {
  try {
    const response = await apiFetch(`/api/staff/${id}`, {
      method: "DELETE",
    });
    await handleApiResponse<{ success: boolean; message: string }>(response);
  } catch {
    // Express API unavailable (CORS / network) — delete directly via Supabase
    const targetStr = String(id).trim();
    const numId = parseInt(targetStr, 10);

    // Direct table DELETE (no RPC — that function returns 400 / doesn't exist)
    if (!isNaN(numId)) {
      const { error } = await supabase.from("staff_accounts").delete().eq("id", numId);
      if (error) {
        // Fallback: mark as deleted if hard-delete fails (e.g. FK constraints)
        await supabase
          .from("staff_accounts")
          .update({ is_active: false, role: "DELETED", display_name: "[DELETED]" })
          .eq("id", numId);
      }
    } else {
      const { error } = await supabase.from("staff_accounts").delete().ilike("username", targetStr);
      if (error) {
        await supabase
          .from("staff_accounts")
          .update({ is_active: false, role: "DELETED", display_name: "[DELETED]" })
          .ilike("username", targetStr);
      }
    }
  }
};
