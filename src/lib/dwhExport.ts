import { prisma } from "./prisma";
import { getDwhClient } from "./dwh";

async function upsertCursor(entityType: string, lastExportedAt?: Date, lastId?: string) {
  await prisma.dwhExportCursor.upsert({
    where: { id: entityType },
    create: { id: entityType, entityType, lastExportedAt, lastId },
    update: { lastExportedAt, lastId },
  });
}

export async function exportOrganizationsToDWH(batchSize = 200) {
  const client = getDwhClient();
  if (!client) return;
  const cursor = await prisma.dwhExportCursor.findUnique({ where: { id: "organization" } });
  const items = await prisma.organization.findMany({
    where: cursor?.lastExportedAt ? { updatedAt: { gt: cursor.lastExportedAt } } : {},
    take: batchSize,
    orderBy: { updatedAt: "asc" },
  });
  if (!items.length) return;
  await client.bulkInsert(
    "dim_organizations",
    items.map((o) => ({
      id: o.id,
      name: o.name,
      region: o.region,
      data_residency: o.dataResidency,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    }))
  );
  await upsertCursor("organization", items[items.length - 1].updatedAt, items[items.length - 1].id);
}

export async function exportEventsToDWH(batchSize = 500) {
  const client = getDwhClient();
  if (!client) return;
  const cursor = await prisma.dwhExportCursor.findUnique({ where: { id: "event" } });
  const events = await prisma.productEvent.findMany({
    where: cursor?.lastExportedAt ? { createdAt: { gt: cursor.lastExportedAt } } : {},
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });
  if (!events.length) return;
  await client.bulkInsert(
    "fact_events",
    events.map((e) => ({
      id: e.id,
      org_id: e.organizationId,
      user_id: e.userId,
      source: e.source,
      event_name: e.eventName,
      created_at: e.createdAt,
    }))
  );
  await upsertCursor("event", events[events.length - 1].createdAt, events[events.length - 1].id);
}

export async function exportRiskSnapshotsToDWH(batchSize = 200) {
  const client = getDwhClient();
  if (!client) return;
  const cursor = await prisma.dwhExportCursor.findUnique({ where: { id: "team_risk" } });
  const rows = await prisma.teamRiskSnapshot.findMany({
    where: cursor?.lastExportedAt ? { createdAt: { gt: cursor.lastExportedAt } } : {},
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });
  if (!rows.length) return;
  await client.bulkInsert(
    "fact_team_risk",
    rows.map((r) => ({
      id: r.id,
      org_id: r.organizationId,
      team_id: r.teamId,
      survey_id: r.surveyId,
      window_start: r.windowStart,
      window_end: r.windowEnd,
      risk_score: r.riskScore,
      stress_level: r.stressLevel,
      created_at: r.createdAt,
    }))
  );
  await upsertCursor("team_risk", rows[rows.length - 1].createdAt, rows[rows.length - 1].id);
}

export async function exportAnomaliesToDWH(batchSize = 200) {
  const client = getDwhClient();
  if (!client) return;
  const cursor = await prisma.dwhExportCursor.findUnique({ where: { id: "anomaly" } });
  const rows = await prisma.anomalyEvent.findMany({
    where: cursor?.lastExportedAt ? { createdAt: { gt: cursor.lastExportedAt } } : {},
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });
  if (!rows.length) return;
  await client.bulkInsert(
    "fact_anomalies",
    rows.map((r) => ({
      id: r.id,
      org_id: r.organizationId,
      scope_type: r.scopeType,
      scope_id: r.scopeId,
      metric: r.metric,
      change_direction: r.changeDirection,
      change_magnitude: r.changeMagnitude,
      severity: r.severity,
      created_at: r.createdAt,
    }))
  );
  await upsertCursor("anomaly", rows[rows.length - 1].createdAt, rows[rows.length - 1].id);
}

export async function exportAllEntities() {
  await exportOrganizationsToDWH();
  await exportEventsToDWH();
  await exportRiskSnapshotsToDWH();
  await exportAnomaliesToDWH();
}
