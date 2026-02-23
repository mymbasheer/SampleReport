import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";

/**
 * Returns the base URL for the Express API server.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL  — explicitly set full URL (recommended for production/cloud)
 *  2. EXPO_PUBLIC_DOMAIN   — legacy Replit-style domain (kept for backward compat)
 *  3. Automatic fallback   — localhost:5000 for local PC development
 */
export function getApiUrl(): string {
  // Full explicit URL (preferred)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // Legacy domain-only env var (Replit / cloud hosting)
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    // If it already includes a protocol, use as-is
    if (host.startsWith("http://") || host.startsWith("https://")) {
      return host.replace(/\/$/, "");
    }
    return `https://${host}`.replace(/\/$/, "");
  }

  // Local PC fallback — works for `npx expo start` + `npm run server:dev`
  return "http://localhost:5000";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown
): Promise<Response> {
  const url = `${getApiUrl()}${route}`;
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // queryKey[0] is already a full path like "/api/customers"
    const path = queryKey[0] as string;
    const url = `${getApiUrl()}${path}`;

    const res = await fetch(url, { credentials: "include" });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes — refreshes when switching DB files
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
