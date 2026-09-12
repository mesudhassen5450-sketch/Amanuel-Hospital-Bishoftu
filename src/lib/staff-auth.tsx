import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { normalizeStaffRole, type StaffRole } from "./staff-roles";

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

  // Expire session and redirect — also force Offline on Express
  const expireSession = useCallback(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    if (token) {
      // keepalive so the request can finish while the page navigates away
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: '{}',
        keepalive: true,
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
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

  // ── Heartbeat & Tab Close Handler (all staff roles → Express) ─────────────
  useEffect(() => {
    if (!user) return;

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const postPresence = (isOnline: boolean, keepalive = false) => {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) return Promise.resolve();
      return fetch(`${API_BASE_URL}/api/auth/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOnline }),
        keepalive,
      }).catch((err) => {
        console.error('Presence update failed:', err);
      });
    };

    // Immediately mark online for this session
    void postPresence(true);

    // Heartbeat every 30 seconds so Admin "Online" stays accurate
    const heartbeatInterval = setInterval(() => {
      void postPresence(true);
    }, 30000);

    // Set offline on tab close / refresh
    const handleUnload = () => {
      void postPresence(false, true);
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      // Leaving the staff app (route unmount) → offline
      void postPresence(false, true);
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

      const result = await response.json().catch(() => ({} as any));

      if (response.ok && result.success && result.token && result.user) {
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

        // Login already sets isOnline on Express; refresh presence immediately
        try {
          await fetch(`${API_BASE_URL}/api/auth/presence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${result.token}`,
            },
            body: JSON.stringify({ isOnline: true }),
          });
        } catch (err) {
          console.error("Failed to update online status on login:", err);
        }

        return { success: true };
      }

      if (response.status === 401) {
        return { success: false, error: result.message || result.error || "Invalid username or password. Please try again." };
      }

      return {
        success: false,
        error: result.message || result.error || "Unable to sign in. Please try again.",
      };
    } catch (apiErr) {
      console.warn("[Staff Auth] Express API login unavailable:", apiErr);
      return { success: false, error: "Cannot reach the login server. Please try again." };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Always mark Offline in Express (same DB Admin list reads) — all roles
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: '{}',
          keepalive: true,
        });
      } catch (err) {
        console.error("Failed to set offline status on logout:", err);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    clearSession();
    setUser(null);
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
