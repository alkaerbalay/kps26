// Business requests no longer depend on an Identity session. Never replay writes.
export function apiFetch(url, options = {}) {
  return globalThis.fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store' });
}
