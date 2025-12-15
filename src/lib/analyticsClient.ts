const sessionId = typeof crypto !== "undefined" ? crypto.randomUUID?.() ?? `${Date.now()}` : `${Date.now()}`;

export async function trackEvent(eventName: string, source: string, properties?: Record<string, any>) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, source, properties, sessionId }),
    });
  } catch {
    // noop
  }
}
