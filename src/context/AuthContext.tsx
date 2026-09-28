import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Role = "resident" | "staff";
type User = { name: string; email: string; role: Role };
type AuthValue = { user: User | null; ready: boolean; signIn: (email: string, password: string, role: Role) => Promise<boolean>; signUp: (name: string, email: string, password: string) => Promise<boolean>; signOut: () => void };
const AuthContext = createContext<AuthValue | null>(null);
const KEY = "rede-now-mock-session";
const ACCOUNTS_KEY = "rede-now-mock-accounts";
const defaultAccounts: (User & { password: string })[] = [
  { name: "Maya Chen", email: "maya@test.com", password: "password123", role: "resident" },
  { name: "Alex Morgan", email: "admin@test.com", password: "password123", role: "staff" },
];
function accounts() { try { return [...defaultAccounts, ...JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]") as (User & { password: string })[]]; } catch { return defaultAccounts; } }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const saved = sessionStorage.getItem(KEY); if (saved) setUser(JSON.parse(saved)); } catch { /* invalid session */ } setReady(true); }, []);
  const persist = (next: User | null) => { setUser(next); if (next) sessionStorage.setItem(KEY, JSON.stringify(next)); else sessionStorage.removeItem(KEY); };
  const signIn: AuthValue["signIn"] = async (email, password, role) => { await new Promise(resolve => setTimeout(resolve, 450)); const match = accounts().find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password && a.role === role); if (!match) return false; persist({ name: match.name, email: match.email, role: match.role }); return true; };
  const signUp: AuthValue["signUp"] = async (name, email, password) => { await new Promise(resolve => setTimeout(resolve, 450)); if (accounts().some(a => a.email.toLowerCase() === email.trim().toLowerCase())) return false; const existing = accounts().filter(a => !defaultAccounts.some(d => d.email === a.email)); localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...existing, { name, email: email.trim(), password, role: "resident" }])); persist({ name, email: email.trim(), role: "resident" }); return true; };
  return <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut: () => persist(null) }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider is missing"); return value; }
