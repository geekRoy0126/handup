"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "./api-fetch";

export type CurrentUser = { id: string; name: string; email: string };

/** Loads the signed-in user; sends logged-out visitors to /login (proxy.ts only checks the cookie exists). */
export function useCurrentUser(): CurrentUser | null {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ user: CurrentUser }>("/api/v1/auth/me", { signal: controller.signal })
      .then((result) => {
        if (result.ok) setUser(result.data.user);
        else if (result.status === 401) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [router]);

  return user;
}
