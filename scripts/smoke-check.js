#!/usr/bin/env node
"use strict";

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const smokeAi = process.env.SMOKE_AI === "1";

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=[^;]+?=)/).map((part) => part.trim());
}

function extractCookieHeader(setCookieValue) {
  const parts = splitSetCookie(setCookieValue).map((cookie) => cookie.split(";")[0]);
  return parts.filter(Boolean).join("; ");
}

async function fetchOrThrow(url, options = {}) {
  const res = await fetch(url, { redirect: "manual", ...options });
  if (!res.ok && res.status !== 302) {
    throw new Error(`Request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res;
}

async function fetchJsonStrict(url, options = {}) {
  const res = await fetch(url, { redirect: "manual", ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed: ${res.status} ${res.statusText} (${url}) ${body}`);
  }
  return res.json();
}

async function main() {
  console.log(`smoke-check: baseUrl=${baseUrl}`);

  await fetchOrThrow(`${baseUrl}/signin`);
  await fetchOrThrow(`${baseUrl}/signup`);

  if (!email || !password) {
    console.log("smoke-check: SMOKE_EMAIL/SMOKE_PASSWORD not set, skipping auth flow");
    return;
  }

  const csrfRes = await fetchOrThrow(`${baseUrl}/api/auth/csrf`, {
    headers: { accept: "application/json" },
  });
  const csrf = await csrfRes.json();
  const csrfCookie = extractCookieHeader(csrfRes.headers.get("set-cookie"));
  if (!csrf?.csrfToken) {
    throw new Error("smoke-check: missing csrfToken");
  }

  const form = new URLSearchParams();
  form.set("csrfToken", csrf.csrfToken);
  form.set("email", email);
  form.set("password", password);
  form.set("callbackUrl", `${baseUrl}/app/overview`);

  const loginRes = await fetchOrThrow(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: csrfCookie,
    },
    body: form.toString(),
  });

  const loginCookie = extractCookieHeader(loginRes.headers.get("set-cookie"));
  const sessionRes = await fetchOrThrow(`${baseUrl}/api/auth/session`, {
    headers: {
      cookie: [csrfCookie, loginCookie].filter(Boolean).join("; "),
      accept: "application/json",
    },
  });
  const session = await sessionRes.json();
  if (!session?.user?.email) {
    throw new Error("smoke-check: login succeeded but session is empty");
  }
  if (session.user.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error("smoke-check: session user mismatch");
  }

  console.log("smoke-check: auth flow ok");

  if (!smokeAi) return;

  const cookieHeader = [csrfCookie, loginCookie].filter(Boolean).join("; ");

  const chatPayload = {
    messages: [{ role: "user", content: "Проверь, что ИИ отвечает на чат. Это автотест." }],
    locale: "ru",
    contextType: "workspace_overview",
    contextData: {},
  };
  const chatData = await fetchJsonStrict(`${baseUrl}/app/api/ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify(chatPayload),
  });
  if (!chatData || typeof chatData.text !== "string" || chatData.text.trim().length === 0) {
    throw new Error("smoke-check: ai chat returned empty text");
  }
  console.log("smoke-check: ai chat ok");

  const analyzePayload = { period: "week", scope: "workspace", locale: "ru" };
  const analyzeData = await fetchJsonStrict(`${baseUrl}/api/ai/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify(analyzePayload),
  });
  if (!analyzeData || !analyzeData.ai || !analyzeData.computed) {
    throw new Error("smoke-check: ai analyze missing payload");
  }
  if (typeof analyzeData.ai.summary !== "string") {
    throw new Error("smoke-check: ai analyze summary missing");
  }
  console.log("smoke-check: ai analyze ok");

  const dailyRes = await fetch(`${baseUrl}/app/my/stress-survey`, {
    redirect: "manual",
    headers: { cookie: cookieHeader },
  });
  if (dailyRes.status === 302) {
    throw new Error("smoke-check: daily survey page redirected (auth issue)");
  }
  if (!dailyRes.ok) {
    throw new Error(`smoke-check: daily survey page failed ${dailyRes.status}`);
  }
  const dailyHtml = await dailyRes.text();
  const aiSurveyMatch = /AI[- ]опрос|AI survey/i.test(dailyHtml);
  if (!aiSurveyMatch) {
    throw new Error("smoke-check: daily survey AI template not detected in HTML");
  }
  console.log("smoke-check: daily AI survey ok");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
