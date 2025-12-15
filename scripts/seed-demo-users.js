/**
 * Simple seed for demo users by role.
 * Run: `npm run seed:demo`
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = "StressDemo123!";
  const hash = await bcrypt.hash(password, 10);

  // find by unique id or create
  let org = await prisma.organization.findFirst({ where: { name: "StressSense Demo Org" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "StressSense Demo Org",
        region: "eu",
        lifecycleStage: "active",
      },
    });
  }

  const users = [
    { role: "ADMIN", email: "admin@stresssense.demo", name: "Demo Admin" },
    { role: "MANAGER", email: "manager@stresssense.demo", name: "Demo Manager" },
    { role: "EMPLOYEE", email: "employee@stresssense.demo", name: "Demo Employee" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, organizationId: org.id, passwordHash: hash, name: u.name },
      create: {
        ...u,
        passwordHash: hash,
        organizationId: org.id,
      },
    });
  }

  console.log("Seeded demo users:");
  users.forEach((u) => console.log(`- ${u.role}: ${u.email} / ${password}`));

  // create demo team and memberships so manager has access
  const team = await prisma.team.upsert({
    where: { id: "demo-team" },
    update: { name: "Demo Team", organizationId: org.id },
    create: { id: "demo-team", name: "Demo Team", organizationId: org.id },
  });

  const manager = await prisma.user.findUnique({ where: { email: "manager@stresssense.demo" } });
  const employee = await prisma.user.findUnique({ where: { email: "employee@stresssense.demo" } });
  if (manager) {
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId: manager.id, teamId: team.id } },
      update: {},
      create: { userId: manager.id, teamId: team.id },
    });
  }
  if (employee) {
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId: employee.id, teamId: team.id } },
      update: {},
      create: { userId: employee.id, teamId: team.id },
    });
  }

  // sample status snapshot for cockpit
  if (prisma.teamStatusSnapshot) {
    await prisma.teamStatusSnapshot.create({
      data: {
        organizationId: org.id,
        teamId: team.id,
        periodStart: new Date(Date.now() - 30 * 86400000),
        periodEnd: new Date(),
        engagementScore: 8.1,
        stressIndex: 6.8,
        riskLevel: "medium",
        participationRate: 0.9,
        coachUsageScore: 0.3,
        academyCompletionRate: 0.4,
        trendLabel: "Improving",
      },
    });
  }

  if (prisma.actionCenterItem) {
    await prisma.actionCenterItem.create({
      data: {
        organizationId: org.id,
        teamId: team.id,
        managerUserId: manager?.id ?? null,
        type: "engagement_drop",
        title: "Engagement dropped by 0.4pt vs last month",
        severity: "high",
        status: "open",
      },
    });
  }

  // ensure settings allow manager access
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: { allowManagerAccessToAllSurveys: true },
    create: { organizationId: org.id, allowManagerAccessToAllSurveys: true },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
