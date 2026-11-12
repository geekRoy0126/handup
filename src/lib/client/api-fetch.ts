// Browser helper for calling our own /api/v1 routes. Never throws for HTTP errors: callers branch on `ok`.
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: string; message: string };

type FetchOptions = { method?: string; body?: unknown; signal?: AbortSignal };

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { code: string; message: string } };
    if (res.ok) return { ok: true, status: res.status, data: json.data as T };
    return {
      ok: false,
      status: res.status,
      code: json.error?.code ?? "INTERNAL",
      message: json.error?.message ?? "Something went wrong.",
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, status: 0, code: "NETWORK", message: "Can't reach HandUp. Check your connection." };
  }
}
