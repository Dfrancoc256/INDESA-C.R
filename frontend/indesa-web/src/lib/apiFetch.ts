export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});

  const hasBody = init.body !== undefined && init.body !== null;
  const bodyIsFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (hasBody && !bodyIsFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
