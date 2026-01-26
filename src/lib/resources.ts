import { prisma } from "./prisma";

export function listArticles(category?: string, query?: string) {
  const results = prisma.article.findMany({
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
  return Promise.resolve(results).then((items) => (Array.isArray(items) ? items : []));
}

export function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({ where: { slug } });
}
