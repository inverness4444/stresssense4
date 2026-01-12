import { prisma } from "./prisma";
import { env } from "@/config/env";
import { ADMIN_LIKE_ROLES } from "@/lib/roles";

type CreateNotificationInput = {
  organizationId: string;
  title: string;
  type: string;
  body?: string | null;
  link?: string | null;
  userId?: string | null;
};

type AdminNotificationInput = Omit<CreateNotificationInput, "userId"> & { dedupe?: boolean };

export function notificationWhereForUser(userId: string, organizationId: string) {
  return {
    organizationId,
    OR: [{ userId: null }, { userId }],
  };
}

export async function createNotification(input: CreateNotificationInput) {
  if (env.featureFlags?.notifications === false) return null;
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      type: input.type,
      body: input.body ?? null,
      link: input.link ?? null,
      userId: input.userId ?? null,
    },
  });
}

export async function createNotificationsForAdmins(input: AdminNotificationInput) {
  const admins = await prisma.user.findMany({
    where: { organizationId: input.organizationId, role: { in: ADMIN_LIKE_ROLES as unknown as string[] } },
    select: { id: true },
  });
  if (!admins.length) return [];
  const link = input.link ?? null;
  const type = input.type;

  return Promise.all(
    admins.map(async (admin) => {
      if (input.dedupe) {
        const existing = await prisma.notification.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: admin.id,
            type,
            link,
          },
        });
        if (existing) return existing;
      }
      return createNotification({ ...input, userId: admin.id });
    })
  );
}

export async function unreadCount(userId: string, organizationId: string) {
  return prisma.notification.count({
    where: {
      ...notificationWhereForUser(userId, organizationId),
      isRead: false,
    },
  });
}

export async function recentNotifications(userId: string, organizationId: string, take = 10) {
  return prisma.notification.findMany({
    where: notificationWhereForUser(userId, organizationId),
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string, organizationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      organizationId,
      OR: [{ userId: null }, { userId }],
    },
  });
  if (!notification) return { error: "Notification not found" };

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  return { success: true };
}

export async function markAllAsRead(userId: string, organizationId: string) {
  await prisma.notification.updateMany({
    where: {
      ...notificationWhereForUser(userId, organizationId),
      isRead: false,
    },
    data: { isRead: true },
  });
  return { success: true };
}
