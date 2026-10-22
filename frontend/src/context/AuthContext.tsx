/**
 * AuthContext.tsx — Authentication provider for Red-E Now.
 *
 * Calls the Flask backend at POST /api/auth/login for real authentication.
 * JWT token stored in localStorage, user cached in sessionStorage.
 * SignUp is a placeholder until the backend registration endpoint is ready.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, getToken } from "@/api/client";

/* ── Types ── */
type Role = "resident" | "staff";
export type User = { id: number; name: string; email: string; role: Role };
type AuthValue = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
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

  // On mount: restore session from token + cached user
  useEffect(() => {
    try {
      const savedToken = getToken();
      const savedUser = sessionStorage.getItem(KEY);
      if (savedToken && savedUser) {
        setUser(JSON.parse(savedUser));
      } else if (savedToken) {
        // Token exists but no cached user — can't verify without /me endpoint
        setToken(null);
      }
    } catch {
      setToken(null);
    }
    setReady(true);
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
   * Sign up — placeholder until POST /api/auth/register is ready.
   */
  const signUp: AuthValue["signUp"] = async () => {
    throw new Error("Registration is not available yet — coming soon.");
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
