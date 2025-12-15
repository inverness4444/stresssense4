import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

type MarketplaceHandler = {
  onInstall?: (organizationId: string, installationId: string, config?: any) => Promise<void>;
  onUninstall?: (organizationId: string, installationId: string) => Promise<void>;
  onConfigChange?: (organizationId: string, installationId: string, config?: any) => Promise<void>;
};

const handlers: Record<string, MarketplaceHandler> = {};

export function registerAppHandler(slug: string, handler: MarketplaceHandler) {
  handlers[slug] = handler;
}

export async function installApp(appId: string, organizationId: string, installedById: string, config?: any) {
  const app = await prisma.marketplaceApp.findUnique({ where: { id: appId } });
  if (!app) throw new Error("App not found");
  const installation = await prisma.marketplaceInstallation.create({
    data: { organizationId, appId, installedById, config },
  });
  await logAuditEvent({
    organizationId,
    userId: installedById,
    action: "MARKETPLACE_APP_INSTALLED",
    targetType: "MARKETPLACE_APP",
    targetId: appId,
    metadata: { installationId: installation.id },
  });
  const handler = handlers[app.slug];
  if (handler?.onInstall) await handler.onInstall(organizationId, installation.id, config);
  return installation;
}

export async function uninstallApp(installationId: string, userId: string) {
  const inst = await prisma.marketplaceInstallation.findUnique({ where: { id: installationId }, include: { app: true } });
  if (!inst) return;
  await prisma.marketplaceInstallation.update({ where: { id: installationId }, data: { status: "inactive" } });
  await logAuditEvent({
    organizationId: inst.organizationId,
    userId,
    action: "MARKETPLACE_APP_UNINSTALLED",
    targetType: "MARKETPLACE_APP",
    targetId: inst.appId,
    metadata: { installationId },
  });
  const handler = inst.app ? handlers[inst.app.slug] : undefined;
  if (handler?.onUninstall) await handler.onUninstall(inst.organizationId, installationId);
}
