import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskToken } from "@/lib/apiKeys";
import { ApiKeyCreator, RevokeKeyButton, WebhookCreator, DisableWebhookButton, EmbedForm, Playground } from "./sections";
import Link from "next/link";

export const dynamic = "force-dynamic";

const scopes = ["read:organization", "read:employees", "read:surveys", "read:comments", "read:metrics", "write:surveys", "manage:webhooks"];

export default async function DevelopersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">You don&apos;t have access to this area.</p>
      </div>
    );
  }

  const [apiKeys, webhooks, embed] = await Promise.all([
    prisma.apiKey.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    }),
    prisma.webhookEndpoint.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.embedConfig.findUnique({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Developers</h1>
        <p className="text-sm text-slate-600">API keys, webhooks, embeds, and a quick playground for integrations.</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">API keys</h2>
            <p className="text-sm text-slate-600">Use these keys with the public API under /api/public/v1.</p>
          </div>
          <ApiKeyCreator availableScopes={scopes} />
        </div>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{key.name}</p>
                <p className="text-xs text-slate-500">
                  {maskToken(key.prefix)} · scopes: {key.scopes.join(", ")}
                </p>
                <p className="text-[11px] text-slate-400">
                  created by {key.createdBy.name} · last used {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "never"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 ${key.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {key.isActive ? "Active" : "Revoked"}
                </span>
                {key.isActive && <RevokeKeyButton id={key.id} />}
              </div>
            </div>
          ))}
          {apiKeys.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No API keys yet.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
            <p className="text-sm text-slate-600">Receive events like survey.created or survey.response.created.</p>
          </div>
          <WebhookCreator />
        </div>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{wh.url}</p>
                <p className="text-xs text-slate-500">
                  events: {wh.eventTypes.join(", ")} · {wh.description || "No description"}
                </p>
                <p className="text-[11px] text-slate-400">Last delivery: {wh.lastDeliveryAt ? new Date(wh.lastDeliveryAt).toLocaleString() : "never"}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 ${wh.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {wh.isActive ? "Active" : "Disabled"}
                </span>
                {wh.isActive && <DisableWebhookButton id={wh.id} />}
              </div>
            </div>
          ))}
          {webhooks.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No webhooks yet.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Embed & widgets</h2>
            <p className="text-sm text-slate-600">Allowlisted origins can render StressSense widgets via /embed/sdk.js.</p>
          </div>
        </div>
        <EmbedForm existingKey={embed?.publicKey} existingOrigins={embed?.allowedOrigins ?? []} />
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Example snippet</p>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-[11px] text-slate-800 shadow-sm">
{`<script src="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/embed/sdk.js"></script>
<div id="stress-widget"></div>
<script>
  StressSense.init({ workspaceId: "${user.organizationId}", publicKey: "${embed?.publicKey ?? "YOUR_PUBLIC_KEY"}" });
  StressSense.renderMetricsWidget("#stress-widget");
</script>`}
          </pre>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Docs & playground</h2>
        <p className="text-sm text-slate-600">
          See <Link className="text-primary hover:underline" href="/developers">/developers</Link> for public docs. Use the API keys above to call endpoints.
        </p>
        <div className="mt-4">
          <Playground />
        </div>
      </section>
    </div>
  );
}
