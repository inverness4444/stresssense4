/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function ensureOrganization(orgId, email) {
  if (orgId) return orgId;
  const existingOrg = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (existingOrg) return existingOrg.id;
  const slugBase = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "owner";
  const slug = `${slugBase}-${crypto.randomBytes(3).toString("hex")}`;
  const org = await prisma.organization.create({
    data: {
      name: "Owner Workspace",
      slug,
      inviteToken: crypto.randomBytes(24).toString("hex"),
      isDemo: false,
    },
  });
  return org.id;
}

async function main() {
  const emailRaw = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!emailRaw || !password) {
    console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
    process.exit(1);
  }
  const email = emailRaw.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  const organizationId = await ensureOrganization(process.env.SUPER_ADMIN_ORG_ID, email);
  const passwordHash = await bcrypt.hash(password, 10);

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "SUPER_ADMIN",
        passwordHash,
        organizationId,
      },
    });
    console.log(`Updated user ${email} to SUPER_ADMIN.`);
  } else {
    const name = email.split("@")[0] || "Super Admin";
    user = await prisma.user.create({
      data: {
        email,
        name,
        role: "SUPER_ADMIN",
        passwordHash,
        organizationId,
      },
    });
    console.log(`Created SUPER_ADMIN user ${email}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
