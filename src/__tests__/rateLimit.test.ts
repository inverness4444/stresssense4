import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("blocks after limit", () => {
    const key = "test:rl";
    for (let i = 0; i < 5; i++) {
      rateLimit(key, { limit: 5, windowMs: 1000 });
    }
    const blocked = rateLimit(key, { limit: 5, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
  });
});
