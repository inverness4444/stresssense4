/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, TeamStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-corp" },
    update: {},
    create: { name: "Demo Corp", slug: "demo-corp" },
  });

  const password = "StressDemo123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const hrUser = await prisma.user.upsert({
    where: { email: "hr@demo.local" },
    update: { passwordHash, name: "Demo HR", role: "HR", organizationId: org.id },
    create: { email: "hr@demo.local", passwordHash, name: "Demo HR", role: "HR", organizationId: org.id },
  });
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@demo.local" },
    update: { passwordHash, name: "Demo Manager", role: "Manager", organizationId: org.id },
    create: { email: "manager@demo.local", passwordHash, name: "Demo Manager", role: "Manager", organizationId: org.id },
  });
  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@demo.local" },
    update: { passwordHash, name: "Demo Employee", role: "Employee", organizationId: org.id },
    create: { email: "employee@demo.local", passwordHash, name: "Demo Employee", role: "Employee", organizationId: org.id },
  });

  const productTeam = await prisma.team.upsert({
    where: { id: "team-product-demo" },
    update: {},
    create: {
      id: "team-product-demo",
      name: "Product",
      description: "Product & design",
      organizationId: org.id,
      memberCount: 6,
      stressIndex: 5.8,
      engagementScore: 7.2,
      participation: 72,
      status: TeamStatus.Watch,
    },
  });
  const marketingTeam = await prisma.team.upsert({
    where: { id: "team-marketing-demo" },
    update: {},
    create: {
      id: "team-marketing-demo",
      name: "Marketing",
      description: "Growth and brand",
      organizationId: org.id,
      memberCount: 5,
      stressIndex: 7.4,
      engagementScore: 6.1,
      participation: 64,
      status: TeamStatus.UnderPressure,
    },
  });

  const hrMember = await prisma.member.upsert({
    where: { id: "member-hr-demo" },
    update: {},
    create: {
      id: "member-hr-demo",
      displayName: "Demo HR",
      role: "HR",
      email: hrUser.email,
      organizationId: org.id,
      teamId: productTeam.id,
      userId: hrUser.id,
    },
  });
  const managerMember = await prisma.member.upsert({
    where: { id: "member-manager-demo" },
    update: {},
    create: {
      id: "member-manager-demo",
      displayName: "Demo Manager",
      role: "Manager",
      email: managerUser.email,
      organizationId: org.id,
      teamId: productTeam.id,
      userId: managerUser.id,
    },
  });
  const employeeMember = await prisma.member.upsert({
    where: { id: "member-employee-demo" },
    update: {},
    create: {
      id: "member-employee-demo",
      displayName: "Demo Employee",
      role: "Employee",
      email: employeeUser.email,
      organizationId: org.id,
      teamId: marketingTeam.id,
      userId: employeeUser.id,
    },
  });

  await prisma.employeeMetrics.upsert({
    where: { memberId: employeeMember.id },
    update: {
      lastStressIndex: 6.5,
      wellbeing: 7.1,
      mood: 3,
      habitsCompletion: 0.4,
      lastUpdatedAt: new Date(),
    },
    create: {
      memberId: employeeMember.id,
      lastStressIndex: 6.5,
      wellbeing: 7.1,
      mood: 3,
      habitsCompletion: 0.4,
    },
  });

  const templates = [
    {
      title: "Stress & Engagement pulse",
      description: "Короткий pulse по нагрузке и вовлечённости",
      isDefault: true,
      questions: [
        { order: 1, text: "Как вы оцениваете текущую нагрузку?", type: "Scale1_5", dimension: "workload" },
        { order: 2, text: "Насколько вы вовлечены в работу?", type: "Scale1_5", dimension: "engagement" },
        { order: 3, text: "Насколько понятны приоритеты недели?", type: "Scale1_5", dimension: "clarity" },
      ],
    },
    {
      title: "Workload & Focus",
      description: "Фокус и количество встреч",
      isDefault: false,
      questions: [
        { order: 1, text: "Сколько фокусного времени у вас есть в неделю?", type: "Scale0_10", dimension: "workload" },
        { order: 2, text: "Мешают ли митинги завершать задачи?", type: "SingleChoice", dimension: "workload", choices: ["нет", "иногда", "да"] },
      ],
    },
    {
      title: "Recognition & Clarity",
      description: "Прозрачность ожиданий и признание",
      isDefault: false,
      questions: [
        { order: 1, text: "Получаете ли вы своевременное признание?", type: "Scale1_5", dimension: "recognition" },
        { order: 2, text: "Цели и ожидания прозрачны?", type: "Scale1_5", dimension: "clarity" },
      ],
    },
  ];

  for (const tpl of templates) {
    const created = await prisma.surveyTemplate.create({
      data: {
        orgId: org.id,
        title: tpl.title,
        description: tpl.description,
        isDefault: tpl.isDefault ?? false,
      },
    });
    for (const q of tpl.questions) {
      await prisma.surveyQuestion.create({
        data: {
          templateId: created.id,
          order: q.order,
          text: q.text,
          type: q.type,
          dimension: q.dimension,
          choices: q.choices ?? null,
        },
      });
    }
  }

  const nudgeTemplates = [
    {
      slug: "meeting-audit",
      title: "Провести ревизию митингов",
      description: "Сократите повторяющиеся встречи и освободите фокус.",
      audience: "team",
      triggerLevel: TeamStatus.Watch,
      triggerTags: ["meetings"],
      estimatedEffort: "medium",
      estimatedImpact: "high",
      recommendedChannel: ["in-app"],
    },
    {
      slug: "redistribute-work",
      title: "Перераспределить задачи",
      description: "Сдвиньте или перераспределите задачи для снижения нагрузки.",
      audience: "manager",
      triggerLevel: TeamStatus.UnderPressure,
      triggerTags: ["workload", "clarity"],
      estimatedEffort: "medium",
      estimatedImpact: "high",
      recommendedChannel: ["in-app"],
    },
    {
      slug: "retro-load",
      title: "Ретро по нагрузке",
      description: "Открыто обсудите, что перегружает и какие решения нужны.",
      audience: "team",
      triggerLevel: TeamStatus.AtRisk,
      triggerTags: ["workload", "communication"],
      estimatedEffort: "medium",
      estimatedImpact: "high",
      recommendedChannel: ["in-app"],
    },
    {
      slug: "participation",
      title: "Повысить участие в опросах",
      description: "Объясните команде, зачем pulse и как используем ответы.",
      audience: "team",
      triggerLevel: TeamStatus.Watch,
      triggerTags: ["participation", "communication"],
      estimatedEffort: "low",
      estimatedImpact: "medium",
      recommendedChannel: ["in-app"],
    },
  ];

  for (const tpl of nudgeTemplates) {
    await prisma.nudgeTemplate.upsert({
      where: { slug: tpl.slug },
      update: {},
      create: {
        slug: tpl.slug,
        title: tpl.title,
        description: tpl.description,
        audience: tpl.audience,
        triggerLevel: tpl.triggerLevel,
        triggerTags: tpl.triggerTags,
        estimatedEffort: tpl.estimatedEffort,
        estimatedImpact: tpl.estimatedImpact,
        recommendedChannel: tpl.recommendedChannel,
      },
    });
  }

  await prisma.teamMetricsHistory.createMany({
    data: [
      {
        teamId: productTeam.id,
        periodLabel: "2025-W01",
        stressIndex: 5.4,
        engagementScore: 7.4,
        participation: 78,
        tags: ["workload"],
      },
      {
        teamId: marketingTeam.id,
        periodLabel: "2025-W01",
        stressIndex: 7.5,
        engagementScore: 6.0,
        participation: 62,
        tags: ["workload", "meetings"],
      },
    ],
    skipDuplicates: true,
  });

  const defaultTemplate = await prisma.surveyTemplate.findFirst({ where: { title: "Stress & Engagement pulse" }, include: { questions: true } });
  if (defaultTemplate) {
    await prisma.surveyRun.create({
      data: {
        orgId: org.id,
        teamId: productTeam.id,
        templateId: defaultTemplate.id,
        title: "Demo pulse run",
        launchedByUserId: hrUser.id,
        launchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        targetCount: 6,
        completedCount: 4,
        avgStressIndex: 5.8,
        avgEngagementScore: 7.1,
        tags: ["workload", "clarity"],
        responses: {
          create: [
            {
              memberId: managerMember.id,
              answers: defaultTemplate.questions.reduce((acc, q) => ({ ...acc, [q.id]: 4 }), {}),
            },
            {
              memberId: employeeMember.id,
              answers: defaultTemplate.questions.reduce((acc, q) => ({ ...acc, [q.id]: 3 }), {}),
            },
          ],
        },
      },
    });
  }

  console.log("Seed completed. Demo users: hr@demo.local / manager@demo.local / employee@demo.local password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
