/**
 * AuthContext.tsx — Authentication provider for Red-E Now.
 *
 * Talks to the Flask backend:
 *   POST /api/auth/login     — sign in
 *   POST /api/auth/register  — resident self-signup (building code required)
 *   GET  /api/auth/me        — restore a session from a stored token
 * JWT stored in localStorage; user cached in sessionStorage for instant paint.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, setToken, getToken } from "@/api/client";

/* ── Types ── */
type Role = "resident" | "staff";
export type User = { id: number; name: string; email: string; role: Role; unit?: string | null };
export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  unit: string;
  buildingCode: string;
};
type AuthValue = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

/* ── Storage key ── */
const KEY = "rede-now-session";

/**
 * AuthProvider — wraps the entire app (placed in __root.tsx).
 * Hydrates the session on mount and exposes auth methods via context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // On mount: restore the session. Paint from the cached user if we have one,
  // then confirm the token with GET /api/auth/me (works in new tabs too).
  useEffect(() => {
    let cancelled = false;
    const savedToken = getToken();

    if (!savedToken) {
      setReady(true);
      return;
    }

    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) {
        setUser(JSON.parse(cached));
        setReady(true);
      }
    } catch {
      sessionStorage.removeItem(KEY);
    }

    api<{ success: boolean; user: User }>("/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        sessionStorage.setItem(KEY, JSON.stringify(res.user));
      })
      .catch((err) => {
        if (cancelled) return;
        // Only drop the session when the server rejects the token;
        // a network blip should not log the user out.
        if (err instanceof ApiError && err.status !== 0 && err.status < 500) {
          setToken(null);
          sessionStorage.removeItem(KEY);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Sign in via POST /api/auth/login.
   * Returns the User object on success, throws on failure.
   */
  const signIn: AuthValue["signIn"] = async (email, password) => {
    try {
      const response = await api<{
        success: boolean;
        access_token: string;
        user: User;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(response.access_token);
      setUser(response.user);
      sessionStorage.setItem(KEY, JSON.stringify(response.user));
      return response.user;
    } catch (err) {
      if (err instanceof Error && "code" in err) {
        // ApiError — re-throw for caller to display
        throw err;
      }
      throw new Error("Unable to connect to server");
    }
  };

  /**
   * Resident self-signup via POST /api/auth/register.
   * Signs the new resident in immediately. Throws ApiError on failure.
   */
  const signUp: AuthValue["signUp"] = async ({ name, email, password, unit, buildingCode }) => {
    const response = await api<{
      success: boolean;
      access_token: string;
      user: User;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, unit, building_code: buildingCode }),
    });

    setToken(response.access_token);
    setUser(response.user);
    sessionStorage.setItem(KEY, JSON.stringify(response.user));
    return response.user;
  };

  /** Sign out — clear token, session, and user state. */
  const signOut = () => {
    setToken(null);
    sessionStorage.removeItem(KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — hook to access the current user and auth methods.
 */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
