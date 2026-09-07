/**
 * Helper utility for persisting and retrieving custom doctor profile metadata
 * (specialty, experience, bio) across Supabase fallback operations and localStorage cache.
 */

export interface DoctorMetadata {
  specialty?: string;
  experience?: string;
  bio?: string;
}

const STORAGE_PREFIX = "doctor_meta_";
const ALL_META_KEY = "all_doctors_metadata";

export function setDoctorMetadata(username: string, metadata: DoctorMetadata): void {
  if (!username) return;
  const cleanUsername = username.toLowerCase().trim();
  try {
    const existing = getDoctorMetadata(cleanUsername) || {};
    const updated = {
      ...existing,
      ...(metadata.specialty ? { specialty: metadata.specialty } : {}),
      ...(metadata.experience ? { experience: metadata.experience } : {}),
      ...(metadata.bio ? { bio: metadata.bio } : {}),
    };

    localStorage.setItem(`${STORAGE_PREFIX}${cleanUsername}`, JSON.stringify(updated));

    // Update global map
    const allRaw = localStorage.getItem(ALL_META_KEY);
    const allMap = allRaw ? JSON.parse(allRaw) : {};
    allMap[cleanUsername] = updated;
    localStorage.setItem(ALL_META_KEY, JSON.stringify(allMap));
  } catch (err) {
    console.warn("Failed to set doctor metadata:", err);
  }
}

export function getDoctorMetadata(username: string): DoctorMetadata | null {
  if (!username) return null;
  const cleanUsername = username.toLowerCase().trim();
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${cleanUsername}`);
    if (item) return JSON.parse(item);

    const allRaw = localStorage.getItem(ALL_META_KEY);
    if (allRaw) {
      const allMap = JSON.parse(allRaw);
      if (allMap[cleanUsername]) return allMap[cleanUsername];
    }
  } catch (err) {
    console.warn("Failed to get doctor metadata:", err);
  }
  return null;
}

export function removeDoctorMetadata(username: string): void {
  if (!username) return;
  const cleanUsername = username.toLowerCase().trim();
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${cleanUsername}`);
    const allRaw = localStorage.getItem(ALL_META_KEY);
    if (allRaw) {
      const allMap = JSON.parse(allRaw);
      delete allMap[cleanUsername];
      localStorage.setItem(ALL_META_KEY, JSON.stringify(allMap));
    }
  } catch (err) {
    console.warn("Failed to remove doctor metadata:", err);
  }
}

const DELETED_STAFF_KEY = "deleted_staff_accounts";

export function markStaffAsDeletedLocally(id: string | number, username?: string): void {
  try {
    const raw = localStorage.getItem(DELETED_STAFF_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (id !== undefined && id !== null) {
      const idStr = String(id).trim();
      if (idStr && !list.includes(idStr)) list.push(idStr);
    }
    if (username) {
      const uStr = username.toLowerCase().trim();
      if (uStr && !list.includes(uStr)) list.push(uStr);
    }
    localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify(list));
    if (username) removeDoctorMetadata(username);
  } catch (err) {
    console.warn("Failed to mark staff as deleted locally:", err);
  }
}

export function isStaffDeletedLocally(id: string | number, username?: string): boolean {
  try {
    const raw = localStorage.getItem(DELETED_STAFF_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    if (id !== undefined && id !== null && list.includes(String(id).trim())) {
      return true;
    }
    if (username && list.includes(username.toLowerCase().trim())) {
      return true;
    }
  } catch (err) {
    console.warn("Failed to check if staff is deleted locally:", err);
  }
  return false;
}

