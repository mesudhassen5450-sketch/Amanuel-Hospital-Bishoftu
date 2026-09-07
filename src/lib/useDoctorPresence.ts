import { useState, useEffect, useCallback, useRef } from "react";
import { doctors } from "./site-data";
import { supabase } from "./supabase";
import { useStaffAuth } from "./staff-auth";
import { getDoctorMetadata } from "./doctor-metadata";

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

      // 1. Primary approach: Fetch from Express backend API
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await fetch(`${API_URL}/api/doctors`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.doctors)) {
            console.log("[Doctors Hook] Loaded live doctors from Express API:", result.doctors);
            setDoctorsList(result.doctors);
            setLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn("[Doctors Hook] Backend API call failed, using Supabase fallback...");
      }

      // 2. Fallback: Fetch directly from Supabase database (handles both 'DOCTOR' and 'doctor')
      const { data, error } = await supabase
        .from("staff_accounts")
        .select("id, display_name, username, role, is_active, is_online, last_seen")
        .in("role", ["DOCTOR", "doctor", "Doctor"])
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const photos = ["/doctor1.jpg", "/doctor2.jpg", "/doctor3.jpg"];
        const doctorsFromDB = data.map((doc: any, i: number) => {
          const meta = getDoctorMetadata(doc.username);
          let rawExp = meta?.experience || doc.experience;
          let expVal = rawExp;
          if (expVal) {
            if (typeof expVal === "number") {
              expVal = `${expVal}+ years experience`;
            } else {
              expVal = String(expVal).trim();
              if (!expVal.toLowerCase().includes("year")) {
                expVal = `${expVal} years experience`;
              }
            }
          }

          return {
            id: doc.id.toString(),
            username: doc.username,
            name: doc.display_name || doc.username,
            specialty: meta?.specialty || doc.specialty || "General Practice",
            experience: expVal || "5+ years experience",
            bio: meta?.bio || doc.bio || "Specialist physician at Dr. Amanuel Hospital.",
            isOnline: Boolean(doc.is_online),
            isAvailable: true,
            photo: photos[i % photos.length],
            lastSeen: doc.last_seen,
          };
        });

        setDoctorsList(doctorsFromDB);
      } else {
        setDoctorsList([]);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setDoctorsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchDoctors();

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
        (payload) => {
          console.log('Staff DB change detected:', payload.eventType, payload);
          // Re-fetch doctor list whenever a doctor is added, updated, or removed in Admin
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
