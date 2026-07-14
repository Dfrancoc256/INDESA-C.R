export const SESSION_EXPIRED_EVENT = "indesa:session-expired";

let sessionExpiredEventDispatched = false;
let pendingRefreshRequest: Promise<boolean> | null = null;

export function resetSessionExpiredEvent() {
  sessionExpiredEventDispatched = false;
}

function resolveRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldNotifySessionExpired(input: RequestInfo | URL) {
  const url = resolveRequestUrl(input);
  return !isAuthEndpoint(url);
}

function isAuthEndpoint(url: string) {
  return url.includes("/api/auth/login") || url.includes("/api/auth/logout") || url.includes("/api/auth/refresh");
}

async function refreshCookieSession() {
  if (pendingRefreshRequest) return pendingRefreshRequest;

  pendingRefreshRequest = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: "" }),
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      pendingRefreshRequest = null;
    });

  return pendingRefreshRequest;
}

function notifySessionExpired(input: RequestInfo | URL) {
  if (typeof window === "undefined" || sessionExpiredEventDispatched || !shouldNotifySessionExpired(input)) {
    return;
  }

  sessionExpiredEventDispatched = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});

  const hasBody = init.body !== undefined && init.body !== null;
  const bodyIsFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (hasBody && !bodyIsFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && !isAuthEndpoint(resolveRequestUrl(input))) {
    const refreshed = await refreshCookieSession();
    if (refreshed) {
      resetSessionExpiredEvent();
      response = await fetch(input, {
        ...init,
        credentials: "include",
        headers,
      });
    }
  }

  if (response.status === 401) {
    notifySessionExpired(input);
  }

  return response;
}
