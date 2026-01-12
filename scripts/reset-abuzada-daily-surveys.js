const { PrismaClient } = require("@prisma/client");

const EMAIL = "abuzada@mail.ru";

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: { id: true, organizationId: true },
    });
    if (!user) {
      throw new Error(`User not found for email ${EMAIL}`);
    }

    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!member) {
      throw new Error(`Member not found for user ${user.id}`);
    }

    const deletedResponses = await prisma.surveyResponse.deleteMany({
      where: {
        memberId: member.id,
        run: { runType: "daily" },
      },
    });

    const deletedRuns = await prisma.surveyRun.deleteMany({
      where: { memberId: member.id, runType: "daily" },
    });

    const template = await prisma.surveyTemplate.findFirst({
      where: { orgId: user.organizationId, name: "Backfill daily survey" },
      select: { id: true },
    });
    let deletedTemplates = 0;
    if (template) {
      await prisma.surveyQuestion.deleteMany({
        where: { templateId: template.id },
      });
      const deleted = await prisma.surveyTemplate.deleteMany({
        where: { id: template.id },
      });
      deletedTemplates = deleted.count;
    }

    console.log({
      deletedResponses: deletedResponses.count,
      deletedRuns: deletedRuns.count,
      deletedTemplates,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
