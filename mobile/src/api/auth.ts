import { apiClient } from "./client";

export async function signIn(email: string, password: string) {
  return apiClient.post("/auth/mobile/login", { email, password });
}
