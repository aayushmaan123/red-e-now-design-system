
/**
 * client.ts
 *
 * This is our shared helper for talking to the Flask backend.
 * Other API files can use it instead of repeating fetch() code.
 */

// Use the API URL from our frontend settings.
// If it isn't set, connect to Flask on port 5000.
const BASE =
  import.meta.env["VITE_API_BASE_URL"] ||
  "http://localhost:5000/api";

// Give API errors a code and HTTP status so the frontend
// can show a useful message when something goes wrong.
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Check whether we're running inside a browser.
const isBrowser = typeof window !== "undefined";

// Remember the user's login token between page refreshes.
let token: string | null = isBrowser
  ? window.localStorage.getItem("rede-now-token")
  : null;

// Save a new login token, or remove it when the user logs out.
export function setToken(newToken: string | null): void {
  token = newToken;

  if (!isBrowser) {
    return;
  }

  if (newToken) {
    window.localStorage.setItem("rede-now-token", newToken);
  } else {
    window.localStorage.removeItem("rede-now-token");
  }
}

// Let other parts of the frontend check the current token.
export function getToken(): string | null {
  return token;
}

// Make a request to Flask and return the JSON response.
// The <T> lets each API function describe its response type.
export async function api<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  // Start with any headers the caller already provided.
  const headers = new Headers(opts.headers);

  // Our backend expects JSON for requests with a body.
  if (opts.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Include the JWT so protected endpoints know who's logged in.
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
    });
  } catch {
    // This usually means Flask is offline or the network failed.
    throw new ApiError(
      "NETWORK_ERROR",
      "Could not connect to the backend. Please try again.",
      0,
    );
  }

  // Read the response safely, even if Flask returns an error page.
  const body: unknown = await response.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "The backend returned an unexpected response.",
      response.status,
    );
  }

  const data = body as {
    success?: boolean;
    error?: {
      code?: string;
      message?: string;
    };
  };

  // Turn backend errors into something our React screens can use.
  if (!response.ok || data.success === false) {
    throw new ApiError(
      data.error?.code || "UNKNOWN_ERROR",
      data.error?.message || "Something went wrong.",
      response.status,
    );
  }

  // The request worked, so return the result to the caller.
  return body as T;
}
