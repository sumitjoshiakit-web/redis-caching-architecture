const API_URL = "/api/cache";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload.data;
}

export function listEntries(searchTerm = "") {
  return request(`${API_URL}?search=${encodeURIComponent(searchTerm.trim())}`);
}

export function createEntry(entry) {
  return request(API_URL, { method: "POST", body: JSON.stringify(entry) });
}

export function updateEntry(id, patch) {
  return request(`${API_URL}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteEntry(id) {
  return request(`${API_URL}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}