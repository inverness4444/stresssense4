const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function request(path: string, method: string, token?: string | null, body?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export const apiClient = {
  get: (path: string, token?: string | null) => request(path, "GET", token),
  post: (path: string, body?: any, token?: string | null) => request(path, "POST", token, body),
};
