import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export type WalletTransactionInput = {
  userId: string;
  amount: number | string;
  type: "MANUAL_DEPOSIT" | "MANUAL_WITHDRAW" | "ADJUSTMENT";
  currency?: string;
  comment?: string | null;
  createdByAdminId?: string | null;
};

type TxClient = Prisma.TransactionClient | PrismaClient;

function toDecimal(value: number | string) {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

function normalizeSignedAmount(input: WalletTransactionInput) {
  const raw = toDecimal(input.amount);
  if (input.type === "MANUAL_WITHDRAW") return raw.abs().negated();
  if (input.type === "MANUAL_DEPOSIT") return raw.abs();
  return raw;
}

export async function applyWalletTransactionTx(client: TxClient, input: WalletTransactionInput) {
  const signedAmount = normalizeSignedAmount(input);
  if (signedAmount.isZero()) {
    throw new Error("Amount must be non-zero");
  }

  const currency = input.currency ?? "RUB";

  const transaction = await client.walletTransaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: signedAmount,
      currency,
      status: "CONFIRMED",
      comment: input.comment ?? null,
      createdByAdminId: input.createdByAdminId ?? null,
    },
  });

  await client.user.update({
    where: { id: input.userId },
    data: { balance: { increment: signedAmount } },
  });

  return transaction;
}

export async function applyWalletTransaction(input: WalletTransactionInput) {
  return prisma.$transaction((tx: TxClient) => applyWalletTransactionTx(tx, input));
}
