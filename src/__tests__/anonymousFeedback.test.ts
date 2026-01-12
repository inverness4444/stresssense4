import { describe, it, expect } from "vitest";
import { sanitizeFeedbackForLeader, canSendAnonToLeader } from "@/lib/anonymousFeedback";
import { rateLimit } from "@/lib/rateLimit";

describe("anonymous feedback", () => {
  it("removes sender identifiers for leaders", () => {
    const input = {
      id: "fb1",
      senderUserId: "user-1",
      senderUser: { id: "user-1", email: "user@test.com" },
      message: "Hello",
    };
    const sanitized = sanitizeFeedbackForLeader(input as any);
    expect((sanitized as any).senderUserId).toBeUndefined();
    expect((sanitized as any).senderUser).toBeUndefined();
  });

  it("blocks anon sending for small teams", () => {
    expect(canSendAnonToLeader(4)).toBe(false);
    expect(canSendAnonToLeader(5)).toBe(true);
  });

  it("rate limits after three messages", () => {
    const key = "anon-feedback-test";
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(key, { limit: 3, windowMs: 1000 }).allowed).toBe(true);
    }
    expect(rateLimit(key, { limit: 3, windowMs: 1000 }).allowed).toBe(false);
  });
});
