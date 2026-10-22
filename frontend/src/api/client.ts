const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const isBrowser = typeof window !== "undefined";
let token: string | null = isBrowser ? localStorage.getItem("rede-now-token") : null;

export function setToken(t: string | null) {
  token = t;
  if (!isBrowser) return;
  if (t) {
    localStorage.setItem("rede-now-token", t);
  } else {
    localStorage.removeItem("rede-now-token");
  }
}

export function getToken(): string | null {
  return token;
}

export async function api<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json();

  if (!res.ok || body.success === false) {
    const err = body.error || { code: "UNKNOWN", message: "Something went wrong." };
    throw new ApiError(err.code, err.message, res.status);
  }
  return body as T;
}
