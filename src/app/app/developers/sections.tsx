'use client';

import { useState, useTransition } from "react";
import { createApiKeyAction, revokeApiKeyAction, createWebhookEndpointAction, deactivateWebhookAction, updateEmbedConfigAction } from "./actions";

export function ApiKeyCreator({ availableScopes }: { availableScopes: string[] }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["read:organization"]);
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleScope = (scope: string) => {
    setSelected((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const submit = () => {
    startTransition(() => {
      (async () => {
        const res = await createApiKeyAction({ name, scopes: selected });
        if (res?.token) setToken(res.token);
      })();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={submit}
        disabled={pending || !name || !selected.length}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Generating…" : "Create API key"}
      </button>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-700">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Backend integration"
        />
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Scopes</p>
        <div className="grid grid-cols-2 gap-2">
          {availableScopes.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(scope)}
                onChange={() => toggleScope(scope)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              {scope}
            </label>
          ))}
        </div>
        {token && (
          <div className="mt-3 rounded-lg bg-white p-3 text-[11px] text-slate-800 shadow-sm">
            <p className="font-semibold text-slate-900">Copy your key now</p>
            <p className="text-[11px] text-slate-600">You won&apos;t be able to see it again.</p>
            <code className="mt-1 block break-all rounded bg-slate-900/90 px-2 py-2 font-mono text-[11px] text-white">{token}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(() => {
          void revokeApiKeyAction(id);
        })
      }
      disabled={pending}
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
    >
      Revoke
    </button>
  );
}

export function WebhookCreator() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>(["survey.created", "survey.response.created"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (evt: string) => {
    setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  };

  const submit = () => {
    startTransition(() => {
      (async () => {
        const res = await createWebhookEndpointAction({ url, description, eventTypes: events });
        if (res?.secret) setSecret(res.secret);
      })();
    });
  };

  const eventOptions = ["survey.created", "survey.closed", "survey.response.created", "survey.insight.generated"];

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={submit}
        disabled={pending || !url || !events.length}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add webhook"}
      </button>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-700">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Endpoint URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mb-3 w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="https://example.com/webhooks/stresssense"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-3 w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Optional description"
        />
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Events</p>
        <div className="grid grid-cols-2 gap-2">
          {eventOptions.map((evt) => (
            <label key={evt} className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={events.includes(evt)}
                onChange={() => toggle(evt)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              {evt}
            </label>
          ))}
        </div>
        {secret && (
          <div className="mt-3 rounded-lg bg-white p-3 text-[11px] text-slate-800 shadow-sm">
            <p className="font-semibold text-slate-900">Signing secret</p>
            <p className="text-[11px] text-slate-600">Copy this now to verify webhook signatures.</p>
            <code className="mt-1 block break-all rounded bg-slate-900/90 px-2 py-2 font-mono text-[11px] text-white">{secret}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export function DisableWebhookButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(() => {
          void deactivateWebhookAction(id);
        })
      }
      disabled={pending}
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
    >
      Disable
    </button>
  );
}

export function EmbedForm({ existingKey, existingOrigins }: { existingKey?: string | null; existingOrigins: string[] }) {
  const [origins, setOrigins] = useState(existingOrigins.join(","));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const submit = (regenerate = false) => {
    startTransition(() => {
      (async () => {
        const res = await updateEmbedConfigAction({ allowedOrigins: origins, regenerate });
        if (!res?.error) setMessage("Saved");
      })();
    });
  };

  return (
    <div className="mt-3 space-y-2 text-sm text-slate-700">
      <p className="text-xs text-slate-500">Allowed origins (comma-separated). Leave empty to allow any origin.</p>
      <input
        value={origins}
        onChange={(e) => setOrigins(e.target.value)}
        className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder="https://intranet.company.com,https://portal.company.com"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => submit(false)}
          disabled={pending}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Save
        </button>
        <button
          onClick={() => submit(true)}
          disabled={pending}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Regenerate public key
        </button>
        <span className="text-xs text-slate-500">Current key: {existingKey ?? "Not generated"}</span>
        {message && <span className="text-xs text-emerald-600">{message}</span>}
      </div>
    </div>
  );
}

export function Playground() {
  const [endpoint, setEndpoint] = useState("/api/public/v1/metrics/overview");
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    startTransition(() => {
      (async () => {
        try {
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          const json = await res.json();
          setResponse(JSON.stringify(json, null, 2));
        } catch (e: any) {
          setResponse(e?.message ?? "Request failed");
        }
      })();
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">API playground</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="/api/public/v1/metrics/overview">GET /metrics/overview</option>
          <option value="/api/public/v1/surveys">GET /surveys</option>
          <option value="/api/public/v1/organizations/me">GET /organizations/me</option>
        </select>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={send}
          disabled={pending || !apiKey}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {response && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-white">{response}</pre>
      )}
    </div>
  );
}
