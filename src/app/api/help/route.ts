import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ctx = searchParams.get("context") ?? undefined;
  const articles = await prisma.article.findMany({
    where: {
      isHelpCenter: true,
      ...(ctx ? { inAppContext: { has: ctx } } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ data: articles });
}
