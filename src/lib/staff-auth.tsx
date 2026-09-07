import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { normalizeStaffRole, type StaffRole } from "./staff-roles";
import { supabase } from "./supabase";

export type { StaffRole };

// ── Session constants ─────────────────────────────────────────────────────────
const SESSION_KEY    = "staff_session";
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;   // 8 hours hard expiry
const IDLE_MAX_MS    = 30 * 60 * 1000;        // 30 minutes inactivity

interface SessionData {
  username:    string;
  role:        StaffRole;
  displayName: string;
  loginAt:     number;   // timestamp
  expiresAt:   number;   // loginAt + SESSION_MAX_MS
  lastActive:  number;   // updated on every activity
}

interface StaffUser {
  username:    string;
  role:        StaffRole;
  displayName?: string;
}

interface StaffAuthCtx {
  user: StaffUser | null;
  login:  (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hydrated: boolean;
}

const StaffAuthContext = createContext<StaffAuthCtx | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────
function readSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: SessionData = JSON.parse(raw);
    const now = Date.now();
    // Hard expiry check
    if (now > s.expiresAt) { sessionStorage.removeItem(SESSION_KEY); return null; }
    // Idle expiry check
    if (now - s.lastActive > IDLE_MAX_MS) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

export function getStaffRole(): StaffRole {
  if (typeof window === "undefined") return null;
  const s = readSession();
  return s?.role ?? null;
}

function writeSession(s: SessionData): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function touchSession(): void {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s: SessionData = JSON.parse(raw);
    s.lastActive = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<StaffUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Expire session and redirect
  const expireSession = useCallback(() => {
    localStorage.removeItem('token'); // Clear JWT token
    clearSession();
    setUser(null);
    window.location.replace("/staff/login");
  }, []);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const s = readSession();
    if (s) {
      const normalizedRole = normalizeStaffRole(s.role as string);
      if (normalizedRole !== s.role) {
        s.role = normalizedRole;
        writeSession(s);
      }
      setUser({ username: s.username, role: normalizedRole, displayName: s.displayName });
    }
    setHydrated(true);
  }, []);

  // ── Inactivity timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      touchSession();
      idleTimer = setTimeout(() => {
        expireSession();
      }, IDLE_MAX_MS);
    };

    // Activity events that reset the idle timer
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start timer immediately

    // Hard expiry check every minute
    const hardCheck = setInterval(() => {
      const s = readSession();
      if (!s) expireSession();
    }, 60_000);

    return () => {
      clearTimeout(idleTimer);
      clearInterval(hardCheck);
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, expireSession]);

  // ── Heartbeat & Tab Close Handler for Doctors ─────────────────────────────
  useEffect(() => {
    if (!user || user.role !== "doctor") return;

    // Heartbeat every 30 seconds to keep doctor online
    const heartbeatInterval = setInterval(async () => {
      try {
        const { updateDoctorOnlineStatus } = await import("./staff-server");
        await updateDoctorOnlineStatus({
          data: { username: user.username, isOnline: true, callerRole: user.role || undefined },
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    }, 30000);

    // Set offline on tab close
    const handleUnload = async () => {
      try {
        const { updateDoctorOnlineStatus } = await import("./staff-server");
        await updateDoctorOnlineStatus({
          data: { username: user.username, isOnline: false, callerRole: user.role || undefined },
        });
      } catch (err) {
        console.error("Failed to set offline on tab close:", err);
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    // 1. Primary approach: Express backend API
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.token && result.user) {
          localStorage.setItem('token', result.token);
          const now = Date.now();
          const normalizedRole = normalizeStaffRole(result.user.role as string);
          if (!normalizedRole) {
            return { success: false, error: "Unknown staff role returned by server." };
          }
          const session: SessionData = {
            username:    result.user.username,
            role:        normalizedRole,
            displayName: result.user.displayName ?? result.user.username,
            loginAt:     now,
            expiresAt:   now + SESSION_MAX_MS,
            lastActive:  now,
          };
          writeSession(session);
          setUser({ username: session.username, role: session.role, displayName: session.displayName });

          if (normalizedRole === "doctor") {
            try {
              const { updateDoctorOnlineStatus } = await import("./staff-server");
              await updateDoctorOnlineStatus({
                data: { username: result.user.username, isOnline: true, callerRole: normalizedRole || undefined },
              });
            } catch (err) {
              console.error("Failed to update doctor online status on login:", err);
            }
          }

          return { success: true };
        } else if (result.message || result.error) {
          return { success: false, error: result.message || result.error };
        }
      }
    } catch (apiErr) {
      console.warn("[Staff Auth] Express API login unavailable, attempting Supabase fallback...", apiErr);
    }

    // 2. Secondary approach: Supabase Database fallback
    try {
      const { data: accounts, error: sbError } = await supabase
        .from("staff_accounts")
        .select("id, username, role, display_name, is_active, password_hash")
        .ilike("username", cleanUsername)
        .eq("is_active", true);

      if (!sbError && accounts && accounts.length > 0) {
        const account = accounts[0];
        const isMatch = account.password_hash === cleanPassword || account.password_hash === cleanPassword.toLowerCase();

        if (isMatch) {
          const now = Date.now();
          const normalizedRole = normalizeStaffRole(account.role as string);
          if (!normalizedRole) {
            return { success: false, error: "Invalid staff role in database account." };
          }
          const session: SessionData = {
            username:    account.username,
            role:        normalizedRole,
            displayName: account.display_name ?? account.username,
            loginAt:     now,
            expiresAt:   now + SESSION_MAX_MS,
            lastActive:  now,
          };
          writeSession(session);
          setUser({ username: session.username, role: session.role, displayName: session.displayName });
          return { success: true };
        }
      }
    } catch (sbErr) {
      console.warn("[Staff Auth] Supabase fallback error:", sbErr);
    }

    // 3. Fallback: Emergency default credentials for development/recovery
    const DEFAULT_ACCOUNTS: Record<string, { role: string; displayName: string }> = {
      admin: { role: "admin", displayName: "System Administrator" },
      reception: { role: "reception", displayName: "Front Desk Receptionist" },
      receptionist: { role: "reception", displayName: "Front Desk Receptionist" },
      doctor: { role: "doctor", displayName: "Dr. Medical Specialist" },
      pharmacy: { role: "pharmacy", displayName: "Pharmacy Department" },
      laboratory: { role: "laboratory", displayName: "Laboratory Department" },
      cashier: { role: "cashier", displayName: "Billing Officer" },
    };

    if (cleanPassword === "admin123" && DEFAULT_ACCOUNTS[cleanUsername]) {
      const acc = DEFAULT_ACCOUNTS[cleanUsername];
      const now = Date.now();
      const normalizedRole = normalizeStaffRole(acc.role);
      if (normalizedRole) {
        const session: SessionData = {
          username:    cleanUsername,
          role:        normalizedRole,
          displayName: acc.displayName,
          loginAt:     now,
          expiresAt:   now + SESSION_MAX_MS,
          lastActive:  now,
        };
        writeSession(session);
        setUser({ username: session.username, role: session.role, displayName: session.displayName });
        return { success: true };
      }
    }

    return { success: false, error: "Invalid username or password. Please try again." };
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    // Set doctor offline status if logging out as doctor
    if (user?.role === "doctor") {
      try {
        const { updateDoctorOnlineStatus } = await import("./staff-server");
        await updateDoctorOnlineStatus({
          data: { username: user.username, isOnline: false, callerRole: user.role || undefined },
        });
      } catch (err) {
        console.error("Failed to update doctor online status on logout:", err);
      }
    }

    // Clear JWT token from localStorage
    localStorage.removeItem('token');
    
    clearSession();
    setUser(null);
    // Replace history so back-button cannot return to protected page
    window.history.replaceState(null, "", "/staff/login");
    window.location.replace("/staff/login");
  };

  return (
    <StaffAuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hydrated }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used within StaffAuthProvider");
  return ctx;
}
