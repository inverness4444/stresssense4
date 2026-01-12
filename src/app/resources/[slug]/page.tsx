export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/resources";
import { sanitizeHtml } from "@/lib/sanitize";

type Props = { params: { slug: string } };

export default async function ArticlePage({ params }: Props) {
  let article = null;
  try {
    article = await getArticleBySlug(params.slug);
  } catch (e) {
    console.warn("Article load failed", e);
  }
  if (!article) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{article.category}</span>
        <h1 className="text-3xl font-semibold text-slate-900">{article.title}</h1>
        <p className="text-sm text-slate-600">{article.description}</p>
        {article.publishedAt && <p className="text-xs text-slate-500">{new Date(article.publishedAt).toLocaleDateString()}</p>}
      </div>
      <article className="prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content ?? "") }} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold text-slate-900">See it in action</h3>
        <p className="text-sm text-slate-600">Запустите стресс-пульс за пару минут и покажите данные команде.</p>
        <a
          href="/signup"
          className="mt-3 inline-flex rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
        >
          Start free trial
        </a>
      </div>
    </div>
  );
}
