import { describe, it, expect } from "vitest";
import { assertSameOrigin, requireOrg, requireRole } from "@/lib/apiAuth";

function makeRequest(origin?: string, host?: string) {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (host) headers.host = host;
  return new Request("http://localhost:3000/api/test", { headers });
}

describe("apiAuth guards", () => {
  it("allows matching origin", () => {
    const res = assertSameOrigin(makeRequest("http://localhost:3000"));
    expect(res).toBeNull();
  });

  it("blocks mismatched origin", () => {
    const res = assertSameOrigin(makeRequest("https://evil.example"));
    expect(res?.status).toBe(403);
  });

  it("allows matching host when origin missing", () => {
    const res = assertSameOrigin(makeRequest(undefined, "localhost:3000"));
    expect(res).toBeNull();
  });

  it("requireRole allows whitelisted roles", () => {
    const res = requireRole({ role: "admin" }, ["ADMIN", "SUPER_ADMIN"]);
    expect(res).toBeNull();
  });

  it("requireRole blocks other roles", () => {
    const res = requireRole({ role: "employee" }, ["ADMIN"]);
    expect(res?.status).toBe(403);
  });

  it("requireOrg blocks when org mismatched", () => {
    const res = requireOrg({ organizationId: "org-1" }, "org-2");
    expect(res?.status).toBe(403);
  });

  it("requireOrg allows matching org", () => {
    const res = requireOrg({ organizationId: "org-1" }, "org-1");
    expect(res).toBeNull();
  });
});
