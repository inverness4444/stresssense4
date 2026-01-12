import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WalletTransactionInput = {
  userId: string;
  amount: number;
  type: "manual_deposit" | "manual_withdraw" | "adjustment";
  currency: string;
  comment?: string | null;
  createdByAdminId?: string | null;
};

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(roundAmount(value));
}

function computeDelta(amount: number, type: WalletTransactionInput["type"]) {
  const normalized = Math.abs(roundAmount(amount));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Invalid amount");
  }
  if (type === "manual_withdraw") return -normalized;
  if (type === "manual_deposit") return normalized;
  return roundAmount(amount);
}

export async function applyWalletTransaction(input: WalletTransactionInput, tx?: typeof prisma) {
  const delta = computeDelta(input.amount, input.type);

  const run = async (db: typeof prisma) => {
    const transaction = await db.walletTransaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        amount: toDecimal(delta),
        currency: input.currency,
        status: "confirmed",
        comment: input.comment ?? null,
        createdByAdminId: input.createdByAdminId ?? null,
      },
    });

    const user = await db.user.update({
      where: { id: input.userId },
      data: { balance: { increment: toDecimal(delta) } },
      select: { balance: true },
    });

    return { transaction, balance: user.balance };
  };

  if (tx) {
    return run(tx);
  }

  return prisma.$transaction((db) => run(db as typeof prisma));
}
