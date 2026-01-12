import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { disconnectSlack, saveSlackChannel } from "./actions";
import { ensureOrgSettings } from "@/lib/access";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PageTitle } from "@/components/ui/PageTitle";
import { connectHRIS, runHRISSync } from "./hrisActions";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) redirect("/app/overview");

  const [settings, slack, hris] = await Promise.all([
    ensureOrgSettings(user.organizationId),
    prisma.slackIntegration.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.hRISIntegration.findUnique({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title="Интеграции" subtitle="Подключите Slack для отправки опросов и алёртов." />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Admin systems</h3>
          </div>
          <p className="text-sm text-slate-600">Sync employees from your HRIS provider.</p>
        </div>
        <form action={connectHRIS} className="mt-4 space-y-2">
          <input type="hidden" name="organizationId" value={user.organizationId} />
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Provider</span>
            <select
              name="provider"
              defaultValue={hris?.provider ?? "generic"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="personio">Personio</option>
              <option value="bamboohr">BambooHR</option>
              <option value="generic">Generic REST HRIS</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">API base URL / subdomain</span>
            <input
              name="apiBaseUrl"
              defaultValue={hris?.apiBaseUrl ?? hris?.subdomain ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">API key / token</span>
            <input
              name="apiKey"
              defaultValue={hris?.apiKey ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              Save HRIS settings
            </button>
            {hris && (
              <form action={runHRISSync}>
                <input type="hidden" name="organizationId" value={user.organizationId} />
                <button className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20">
                  Run sync now
                </button>
              </form>
            )}
          </div>
          {hris?.lastSyncAt && (
            <p className="text-xs text-slate-500">Last sync: {new Date(hris.lastSyncAt).toLocaleString()}</p>
          )}
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Slack</h3>
            <p className="text-sm text-slate-600">
              Отправляйте инвайты и напоминания напрямую в Slack. Статус: {settings.slackEnabled ? "Подключено" : "Не подключено"}.
            </p>
          </div>
          {settings.slackEnabled ? (
            <form action={disconnectSlack}>
              <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                Отключить
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/slack/connect"
              className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
            >
              Подключить Slack
            </Link>
          )}
        </div>
        {settings.slackEnabled && (
          <form
            action={async (formData) => {
              "use server";
              const channel = formData.get("channelId") as string;
              await saveSlackChannel(channel);
            }}
            className="mt-4 space-y-2"
          >
            <label className="block text-sm font-semibold text-slate-800">
              Канал для алёртов
              <input
                name="channelId"
                defaultValue={settings.slackAlertsChannelId ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="#alerts или ID канала"
              />
            </label>
            <p className="text-xs text-slate-500 flex items-start gap-1">
              Сюда придут сообщения о высоком стрессе или проблемах с участием.
              <InfoTooltip text="Укажите Slack channel ID или #channel, чтобы получать оповещения." />
            </p>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
              Сохранить
            </button>
          </form>
        )}
        {slack?.teamName && <p className="mt-3 text-xs text-slate-600">Подключён workspace: {slack.teamName}</p>}
      </div>
    </div>
  );
}
