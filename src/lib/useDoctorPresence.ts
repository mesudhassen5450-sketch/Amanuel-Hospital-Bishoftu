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

      // If Supabase is not configured, skip directly to the REST API fallback
      if (!isSupabaseConfigured) {
        try {
          const response = await apiFetch("/api/doctors", { method: "GET" });
          const result = await handleApiResponse<{ success: boolean; doctors: any[] }>(response);
          setDoctorsList(result.doctors || []);
        } catch {
          setDoctorsList([]);
        }
        return;
      }

      const { data, error } = await supabase
        .from("staff_accounts")
        .select("id, display_name, username, role, is_active, is_online, last_seen")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      let staffRows: any[] = data || [];
      if (error) {
        console.error("[Doctors] Supabase error:", error);
        try {
          const response = await apiFetch("/api/doctors", { method: "GET" });
          const result = await handleApiResponse<{ success: boolean; doctors: any[] }>(response);
          setDoctorsList(result.doctors || []);
          return;
        } catch {
          setDoctorsList([]);
          return;
        }
      }

      staffRows = staffRows.filter(
        (doc: any) =>
          normalizeStaffRole(doc.role) === "doctor" &&
          doc.role?.toUpperCase() !== "DELETED" &&
          doc.username !== "[DELETED]" &&
          !isStaffDeletedLocally(doc.id, doc.username)
      );

      const { data: profiles, error: profilesError } = await supabase
        .from("doctors")
        .select(
          "username, specialty, experience_years, consultation_fee, rating, status, bio, is_available"
        );

      if (profilesError) {
        // Likely the new columns don't exist yet (migration pending).
        // Log a clear message and fall back to the base columns only.
        console.warn(
          "[Doctors] doctors table query failed — new columns may not be migrated yet.\n" +
            "Run supabase/migrations/add_doctor_profile_columns.sql in your Supabase SQL Editor.\n" +
            "Error:", profilesError.message
        );
      }

      // If the extended query failed, retry with only the columns that have always existed
      let resolvedProfiles = profiles;
      if (profilesError || !profiles) {
        const { data: fallbackProfiles } = await supabase
          .from("doctors")
          .select("username, specialty, experience, bio, is_available");
        resolvedProfiles = fallbackProfiles;
      }

      const profileMap = new Map(
        (resolvedProfiles || []).map((p: any) => [String(p.username || "").toLowerCase(), p])
      );

      const photos = ["/doctor1.jpg", "/doctor2.jpg", "/doctor3.jpg"];
      const doctorsFromDB = staffRows.map((doc: any, i: number) => {
        const profile = profileMap.get(String(doc.username || "").toLowerCase());
        const meta = getDoctorMetadata(doc.username);

        // Prefer experience_years (numeric) from DB; fall back to legacy string or metadata
        const rawExpYears = profile?.experience_years;
        const rawExpLegacy = meta?.experience;
        let expVal: string;
        if (rawExpYears != null) {
          expVal = `${rawExpYears}+ years experience`;
        } else if (rawExpLegacy) {
          expVal = String(rawExpLegacy).trim();
          if (expVal && !expVal.toLowerCase().includes("year")) {
            expVal = `${expVal} years experience`;
          }
        } else {
          expVal = "5+ years experience";
        }

        return {
          id: doc.id.toString(),
          username: doc.username,
          name: doc.display_name || doc.username,
          specialty: profile?.specialty || meta?.specialty || "General Practice",
          experienceYears: rawExpYears ?? null,
          experience: expVal,
          consultationFee: profile?.consultation_fee ?? null,
          rating: profile?.rating ?? null,
          status: profile?.status ?? null,
          bio: profile?.bio || meta?.bio || "",
          isOnline: Boolean(doc.is_online),
          isAvailable: profile?.is_available ?? true,
          photo: photos[i % photos.length],
          lastSeen: doc.last_seen,
        };
      });
      setDoctorsList(doctorsFromDB);
    } catch (err) {
      console.error("[Doctors] Fetch error:", err);
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
 * Updates doctor status in Supabase Realtime with periodic heartbeat
 *
 * @param doctorUsername - The username of the doctor to track (string like "doctor" or "doctor2")
 * @param isAvailable - Whether the doctor is available for calls
 */
export function useDoctorPresence(doctorUsername: string | undefined, isAvailable: boolean = true) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!doctorUsername) return;
    // Skip all Supabase calls when credentials are not configured
    if (!isSupabaseConfigured) return;

    // 1. Immediately set online state on mount
    const setOnline = async () => {
      try {
        await supabase
          .from('staff_accounts')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('username', doctorUsername);
        console.log(`[Doctor Presence] Doctor ${doctorUsername} set to online`);
      } catch (error) {
        console.error("Error setting doctor online:", error);
      }
    };

    setOnline();

    // 2. Heartbeat loop to keep last_seen updated (every 30 seconds)
    const startHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(async () => {
        if (isAvailable) {
          try {
            await supabase
              .from('staff_accounts')
              .update({ last_seen: new Date().toISOString() })
              .eq('username', doctorUsername);
          } catch (error) {
            console.error("Heartbeat error:", error);
          }
        }
      }, 30000); // 30 seconds
    };

    startHeartbeat();

    // 3. Mark offline on unmount / navigate away
    const setOffline = async () => {
      try {
        await supabase
          .from('staff_accounts')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('username', doctorUsername);
        console.log(`[Doctor Presence] Doctor ${doctorUsername} set to offline`);
      } catch (error) {
        console.error("Error setting doctor offline:", error);
      }
    };

    // Handle window close
    const handleUnload = () => {
      setOffline();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      setOffline();
      window.removeEventListener('beforeunload', handleUnload);
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
