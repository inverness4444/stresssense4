import { prisma } from "./prisma";

export function listArticles(category?: string, query?: string) {
  return prisma.article.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(query
        ? {
            title: { contains: query, mode: "insensitive" },
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
}

export function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({ where: { slug } });
}
