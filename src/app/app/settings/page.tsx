import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureOrgSettings } from "@/lib/access";
import { updateSettings } from "./actions";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { prisma } from "@/lib/prisma";
import { saveSSOConfig } from "./ssoActions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role)) redirect("/app/overview");
  const canEdit = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);

  const settings = await ensureOrgSettings(user.organizationId);
  const sso = await prisma.sSOConfig.findUnique({ where: { organizationId: user.organizationId } });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Workspace settings</h2>
        <p className="text-sm text-slate-600">
          Control how StressSense aggregates and shares stress insights in your company.
        </p>
      </div>

      <form action={updateSettings} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Privacy & anonymity</h3>
          <p className="text-sm text-slate-600">Hide team-level results until enough responses are collected.</p>
          <div className="mt-4 space-y-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">
                Minimum responses for breakdown <InfoTooltip text="Командные метрики показываются только при достижении этого порога." />
              </span>
              <input
                type="number"
                name="minResponsesForBreakdown"
                min={1}
                defaultValue={settings.minResponsesForBreakdown}
                disabled={!canEdit}
                className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              <p className="text-xs text-slate-500">Below this number, team or subgroup results stay hidden.</p>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Stress scale</h3>
          <p className="text-sm text-slate-600">Choose the scale range used to compute stress index.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">
                Scale minimum <InfoTooltip text="Минимальное значение шкалы для вопросов с оценкой." />
              </span>
              <select
                name="stressScaleMin"
                defaultValue={settings.stressScaleMin ?? 1}
                disabled={!canEdit}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="1">1</option>
                <option value="0">0</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">
                Scale maximum <InfoTooltip text="Максимальное значение шкалы для вопросов с оценкой." />
              </span>
              <select
                name="stressScaleMax"
                defaultValue={settings.stressScaleMax ?? 5}
                disabled={!canEdit}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="5">5</option>
                <option value="7">7</option>
                <option value="10">10</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Managers access</h3>
          <p className="text-sm text-slate-600">
            Decide whether managers can view surveys targeting their teams even if they weren&apos;t creators.
          </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="allowManagerAccessToAllSurveys"
                defaultChecked={settings.allowManagerAccessToAllSurveys}
                disabled={!canEdit}
                className="rounded border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              Allow managers to access all surveys that include their teams
            </label>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Localization</h3>
          <p className="text-sm text-slate-600">Choose your workspace timezone.</p>
          <label className="mt-4 block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Timezone</span>
            <select
              name="timezone"
              defaultValue={settings.timezone ?? "UTC"}
              disabled={!canEdit}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="UTC">UTC</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
            </select>
          </label>
        </section>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
            >
              Save settings
            </button>
          </div>
        )}
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Single sign-on (SSO)</h3>
        </div>
        <p className="text-sm text-slate-600">Let your employees sign in with your identity provider.</p>
        <form action={saveSSOConfig} className="mt-4 space-y-3">
          <input type="hidden" name="organizationId" value={user.organizationId} />
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Provider type</span>
            <select
              name="providerType"
              defaultValue={sso?.providerType ?? "saml"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="saml">SAML</option>
              <option value="oidc">OIDC</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Display name</span>
            <input
              name="displayName"
              defaultValue={sso?.displayName ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Issuer / Entity ID</span>
              <input
                name="issuer"
                defaultValue={sso?.issuer ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">SSO / Auth URL</span>
              <input
                name="ssoUrl"
                defaultValue={sso?.ssoUrl ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Certificate (SAML) or OIDC client secret</span>
            <textarea
              name="certificate"
              defaultValue={sso?.certificate ?? ""}
              className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">OIDC Client ID</span>
              <input
                name="oidcClientId"
                defaultValue={sso?.oidcClientId ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">OIDC Token URL</span>
              <input
                name="oidcTokenUrl"
                defaultValue={sso?.oidcTokenUrl ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">OIDC UserInfo URL</span>
              <input
                name="oidcUserInfoUrl"
                defaultValue={sso?.oidcUserInfoUrl ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">OIDC Scope</span>
              <input
                name="oidcScope"
                defaultValue={sso?.oidcScope ?? "openid profile email"}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              name="isEnabled"
              defaultChecked={sso?.isEnabled ?? false}
              className="rounded border-slate-300 text-primary focus:ring-primary/40"
            />
            Enable SSO for this workspace
          </label>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
            Save SSO settings
          </button>
        </form>
      </section>
    </div>
  );
}
