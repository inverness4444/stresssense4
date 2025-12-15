/* eslint-disable @typescript-eslint/no-require-imports */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/stresssense";
}
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const defaultTemplate = require("../dist-survey-template.json");

const prisma = new PrismaClient();

async function main() {
  let organization =
    (await prisma.organization.findFirst()) ||
    (await prisma.organization.create({
      data: { name: "Quadrant Demo" },
    }));

  await prisma.organizationSettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      minResponsesForBreakdown: 4,
      stressScaleMin: 1,
      stressScaleMax: 5,
      allowManagerAccessToAllSurveys: true,
      timezone: "UTC",
    },
  });

  const demoPassword = "StressDemo123!";
  const demoHash = await bcrypt.hash(demoPassword, 10);

  let admin = await prisma.user.findUnique({ where: { email: "admin@stresssense.demo" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Demo Admin",
        email: "admin@stresssense.demo",
        passwordHash: demoHash,
        role: "ADMIN",
        organizationId: organization.id,
      },
    });
  } else {
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: demoHash } });
  }

  let manager = await prisma.user.findUnique({ where: { email: "manager@stresssense.demo" } });
  if (!manager) {
    manager = await prisma.user.create({
      data: {
        name: "Demo Manager",
        email: "manager@stresssense.demo",
        passwordHash: demoHash,
        role: "MANAGER",
        organizationId: organization.id,
      },
    });
  } else {
    await prisma.user.update({ where: { id: manager.id }, data: { passwordHash: demoHash } });
  }

  const employeeEmails = ["employee@stresssense.demo", "dani@stresssense.demo", "sydney@stresssense.demo"];
  const employeeIds = [];
  for (const email of employeeEmails) {
    let emp = await prisma.user.findUnique({ where: { email } });
    if (!emp) {
      emp = await prisma.user.create({
        data: {
          name: email.split("@")[0],
          email,
          passwordHash: demoHash,
          role: "EMPLOYEE",
          organizationId: organization.id,
        },
      });
    } else {
      await prisma.user.update({ where: { id: emp.id }, data: { passwordHash: demoHash } });
    }
    employeeIds.push(emp.id);
  }

  const teamA =
    (await prisma.team.findFirst({ where: { name: "People Ops", organizationId: organization.id } })) ||
    (await prisma.team.create({
      data: { name: "People Ops", description: "HR, talent, and operations", organizationId: organization.id },
    }));

  const teamB =
    (await prisma.team.findFirst({ where: { name: "Engineering", organizationId: organization.id } })) ||
    (await prisma.team.create({
      data: { name: "Engineering", description: "Product & platform squads", organizationId: organization.id },
    }));

  await prisma.userTeam.createMany({
    data: [
      { userId: admin.id, teamId: teamA.id },
      { userId: admin.id, teamId: teamB.id },
      { userId: manager.id, teamId: teamA.id },
      { userId: employeeIds[0], teamId: teamA.id },
      { userId: employeeIds[1], teamId: teamB.id },
    ],
    skipDuplicates: true,
  });

  const existingTemplate = await prisma.surveyTemplate.findFirst();
  if (!existingTemplate && defaultTemplate) {
    await prisma.surveyTemplate.create({
      data: {
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        questions: { createMany: { data: defaultTemplate.questions } },
      },
    });
  }

  const template = await prisma.surveyTemplate.findFirst({ include: { questions: true } });

  const existingSurvey = await prisma.survey.findFirst({ where: { organizationId: organization.id } });
  if (!existingSurvey && template) {
    const survey = await prisma.survey.create({
      data: {
        organizationId: organization.id,
        templateId: template.id,
        createdById: admin.id,
        name: "Demo Stress Pulse",
        description: "Sample data for demo workspace",
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        minResponsesForBreakdown: 3,
        questions: {
          create: template.questions.map((q) => ({
            order: q.order,
            text: q.text,
            type: q.type,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
          })),
        },
        targets: { create: [{ teamId: teamA.id }, { teamId: teamB.id }] },
      },
      include: { questions: true },
    });

    const targetUserIds = [admin.id, manager.id, ...employeeIds];
    const tokens = await Promise.all(
      targetUserIds.map((uid) =>
        prisma.surveyInviteToken.create({
          data: { surveyId: survey.id, userId: uid, token: randomBytes(20).toString("hex"), usedAt: null },
        })
      )
    );

    const responseTokens = tokens.slice(0, 4);
    for (const tok of responseTokens) {
      await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          inviteTokenId: tok.id,
          submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 3 + 1)),
          answers: {
            create: survey.questions.map((q) => ({
              questionId: q.id,
              scaleValue: q.type === "SCALE" ? Math.floor(Math.random() * 3) + 3 : null,
              textValue: q.type === "TEXT" ? "Feeling busy but supported." : null,
            })),
          },
        },
      });
      await prisma.surveyInviteToken.update({ where: { id: tok.id }, data: { usedAt: new Date() } });
    }

    await prisma.notification.createMany({
      data: [
        {
          organizationId: organization.id,
          title: "New stress pulse launched",
          type: "SURVEY_CREATED",
          body: `${survey.name} is live for demo data.`,
          link: `/app/surveys/${survey.id}`,
        },
        {
          organizationId: organization.id,
          title: "Participation looks healthy",
          type: "SURVEY_AT_RISK",
          body: "Demo reminder: keep participation above 60%.",
          link: `/app/surveys/${survey.id}`,
        },
      ],
      skipDuplicates: true,
    });
  }

  const plans = [
    {
      key: "free",
      name: "Free",
      stripePriceId: "price_free_placeholder",
      monthlyPriceCents: 0,
      billingMode: "per_seat",
      baseSeats: 20,
      pricePerSeatCents: 0,
      includedAIRequests: 500,
      includedAutomationWorkflows: 0,
      includedMarketplaceApps: 1,
      featureKeys: [
        "core.surveys",
        "core.dashboard.basic",
        "ai.summary.lite",
        "integrations.slack.basic",
      ],
    },
    {
      key: "starter",
      name: "Starter",
      stripePriceId: "price_starter_placeholder",
      monthlyPriceCents: 9900,
      billingMode: "per_seat",
      baseSeats: 50,
      pricePerSeatCents: 400,
      includedAIRequests: 10000,
      includedAutomationWorkflows: 3,
      includedMarketplaceApps: 3,
      featureKeys: [
        "core.surveys",
        "core.dashboard.basic",
        "ai.summary.full",
        "ai.assistant.basic",
        "integrations.slack.full",
        "kiosks.basic",
        "api.access.readonly",
        "risk.analytics.basic",
      ],
    },
    {
      key: "growth",
      name: "Growth",
      stripePriceId: "price_growth_placeholder",
      monthlyPriceCents: 29900,
      billingMode: "per_seat",
      baseSeats: 200,
      pricePerSeatCents: 300,
      includedAIRequests: 50000,
      includedAutomationWorkflows: 10,
      includedMarketplaceApps: 10,
      featureKeys: [
        "core.surveys",
        "core.dashboard.basic",
        "ai.summary.full",
        "ai.assistant.advanced",
        "integrations.slack.full",
        "kiosks.unlimited",
        "api.access.full",
        "risk.analytics.full",
        "automation.workflows",
        "marketplace.install",
      ],
    },
    {
      key: "scale",
      name: "Scale",
      stripePriceId: "price_scale_placeholder",
      monthlyPriceCents: 89900,
      billingMode: "per_seat",
      baseSeats: 500,
      pricePerSeatCents: 200,
      includedAIRequests: 200000,
      includedAutomationWorkflows: 30,
      includedMarketplaceApps: 999,
      featureKeys: [
        "core.surveys",
        "core.dashboard.basic",
        "ai.summary.full",
        "ai.assistant.advanced",
        "integrations.slack.full",
        "kiosks.unlimited",
        "api.access.full",
        "risk.analytics.full",
        "automation.workflows",
        "marketplace.install",
        "integrations.hris",
        "sso",
        "marketplace.third_party",
        "automation.advanced",
        "projects.spaces",
      ],
    },
    {
      key: "enterprise",
      name: "Enterprise",
      stripePriceId: "price_enterprise_placeholder",
      monthlyPriceCents: 200000,
      billingMode: "per_seat",
      baseSeats: 1000,
      pricePerSeatCents: 150,
      includedAIRequests: 500000,
      includedAutomationWorkflows: 100,
      includedMarketplaceApps: 999,
      featureKeys: [
        "core.surveys",
        "core.dashboard.basic",
        "ai.summary.full",
        "ai.assistant.advanced",
        "integrations.slack.full",
        "kiosks.unlimited",
        "api.access.full",
        "risk.analytics.full",
        "automation.workflows",
        "marketplace.install",
        "integrations.hris",
        "sso",
        "marketplace.third_party",
        "automation.advanced",
        "projects.spaces",
        "data.residency.custom",
        "dwh.export.managed",
        "support.sla",
        "audit.enhanced",
        "partner.mode",
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { stripePriceId: plan.stripePriceId },
      update: plan,
      create: plan,
    });
  }

  await prisma.featureFlag.upsert({
    where: { key: "manager_cockpit_v1" },
    update: { defaultEnabled: true },
    create: { key: "manager_cockpit_v1", description: "Manager cockpit", defaultEnabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { key: "employee_cockpit_v1" },
    update: { defaultEnabled: true },
    create: { key: "employee_cockpit_v1", description: "Employee wellbeing cockpit", defaultEnabled: true },
  });

  const addOns = [
    {
      key: "ai_plus",
      name: "AI+ Pack",
      description: "Extra 100k AI requests and priority assistant",
      monthlyPriceCents: 9900,
      featureKeys: ["ai.requests.boost", "ai.assistant.priority"],
    },
    {
      key: "automation_plus",
      name: "Automation+",
      description: "Extra 20 workflows",
      monthlyPriceCents: 14900,
      featureKeys: ["automation.workflows.extra"],
    },
    {
      key: "marketplace_unlimited",
      name: "Marketplace Unlimited",
      description: "Unlimited marketplace apps",
      monthlyPriceCents: 19900,
      featureKeys: ["marketplace.apps.unlimited"],
    },
  ];

  for (const addOn of addOns) {
    await prisma.addOn.upsert({
      where: { key: addOn.key },
      update: addOn,
      create: addOn,
    });
  }

  const articleCount = await prisma.article.count();
  if (articleCount === 0) {
    await prisma.article.createMany({
      data: [
        {
          slug: "stress-pulse-guide",
          title: "How to run a stress pulse that people actually answer",
          description: "Short guide on cadence, anonymity, and communicating purpose.",
          category: "Guide",
          content: "<p>Keep it short, keep it anonymous, share the why. Rotate 5-7 questions and stick to one cadence.</p>",
          featured: true,
          publishedAt: new Date(),
        },
        {
          slug: "use-case-hr-burnout",
          title: "HR teams: catching burnout risk early",
          description: "Use StressSense to surface hotspots before they become attrition.",
          category: "Use case",
          content: "<p>Target teams with heavier workloads, watch participation, and follow up on comments weekly.</p>",
          featured: false,
          publishedAt: new Date(),
        },
      ],
    });
  }

  const internal = await prisma.internalUser.findUnique({ where: { email: "internal@stresssense.app" } });
  if (!internal) {
    const passwordHash = await bcrypt.hash("internal1234", 10);
    await prisma.internalUser.create({
      data: {
        email: "internal@stresssense.app",
        name: "Internal Admin",
        role: "admin",
        passwordHash,
      },
    });
  }

  console.log("Seed complete. Demo admin: admin@stresssense.demo / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
