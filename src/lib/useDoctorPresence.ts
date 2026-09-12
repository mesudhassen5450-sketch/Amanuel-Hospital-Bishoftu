import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { normalizeStaffRole } from "./staff-roles";
import { getDoctorMetadata, isStaffDeletedLocally } from "./doctor-metadata";
import { apiFetch, handleApiResponse } from "./api/client";

export interface DoctorAccount {
  id: number | string;
  displayName: string;
  username: string;
  role: string;
  isOnline: boolean;
  isActive: boolean;
  lastSeen: string | null;
}

/**
 * Hook for tracking doctor presence in real-time
 * Fetches doctor data from database and provides online/offline status
 * Uses Supabase Realtime for real-time updates (no polling)
 */
export function useDoctorsPresence() {
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);

      // Express ONLY — same staff_accounts + doctors DB that Admin create writes.
      // Never prefer Supabase anon staff_accounts (bio-only rows hid new doctors).
      const response = await apiFetch("/api/doctors", { method: "GET" });
      const result = await handleApiResponse<{ success: boolean; doctors: any[] }>(response);
      const photos = ["/doctor1.jpg", "/doctor2.jpg", "/doctor3.jpg"];
      setDoctorsList(
        (result.doctors || [])
          .filter(
            (doc: any) =>
              doc?.username &&
              doc.username !== "[DELETED]" &&
              !isStaffDeletedLocally(doc.id, doc.username)
          )
          .map((doc: any, i: number) => {
            const displayName =
              doc.name || doc.displayName || doc.display_name || doc.username;
            return {
              ...doc,
              photo: doc.photo || photos[i % photos.length],
              id: doc.id,
              username: doc.username,
              name: displayName,
              displayName,
              specialty: doc.specialty || "General Practice",
              experience: doc.experience || "5+ years experience",
              bio: doc.bio || "",
              isOnline: Boolean(doc.isOnline ?? doc.is_online),
              isActive: doc.isActive !== false && doc.is_active !== false,
              isAvailable: doc.isAvailable !== false && doc.is_available !== false,
            };
          })
      );
    } catch (err) {
      console.error("[Doctors] Express /api/doctors fetch error:", err);
      setDoctorsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchDoctors();

    // Only subscribe to Realtime when Supabase is properly configured
    if (!isSupabaseConfigured) return;

    // Subscribe to Supabase Realtime for staff_accounts INSERT, UPDATE, DELETE events
    const channel = supabase
      .channel('doctors-presence-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_accounts',
        },
        () => {
          fetchDoctors();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctors',
        },
        () => {
          fetchDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctors]);

  const onlineDoctors = doctorsList.filter((doc) => doc.isOnline);
  const offlineDoctors = doctorsList.filter((doc) => !doc.isOnline);

  return {
    doctors: doctorsList,
    onlineDoctors,
    offlineDoctors,
    loading,
    refresh: fetchDoctors,
  };
}

/**
 * Hook for tracking individual doctor presence with heartbeat
 * Updates presence through Express (same DB Admin Online/Offline reads)
 *
 * @param doctorUsername - The username of the doctor to track
 * @param isAvailable - Whether the doctor is available for calls
 */
export function useDoctorPresence(doctorUsername: string | undefined, isAvailable: boolean = true) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!doctorUsername) return;

    const postPresence = (isOnline: boolean, keepalive = false) => {
      return apiFetch("/api/auth/presence", {
        method: "POST",
        body: JSON.stringify({ isOnline }),
        keepalive,
      }).catch((error) => {
        console.error("Presence update error:", error);
      });
    };

    // 1. Immediately set online state on mount
    void postPresence(true).then(() => {
      console.log(`[Doctor Presence] Doctor ${doctorUsername} set to online`);
    });

    // 2. Heartbeat loop to keep last_seen updated (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      if (isAvailable) {
        void postPresence(true);
      }
    }, 30000);

    // 3. Mark offline on unmount / navigate away / tab close
    const handleUnload = () => {
      void postPresence(false, true);
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      void postPresence(false, true);
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [doctorUsername, isAvailable]);
}

/**
 * Mock version for development without real socket connection
 * In production, replace with actual WebSocket/Supabase integration
 */
export function useMockDoctorPresence(doctorId: string | undefined) {
  useEffect(() => {
    if (!doctorId) return;

    console.log(`[Mock Presence] Doctor ${doctorId} is now online`);

    const handleUnload = () => {
      console.log(`[Mock Presence] Doctor ${doctorId} is now offline`);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      console.log(`[Mock Presence] Doctor ${doctorId} is now offline`);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [doctorId]);
}
