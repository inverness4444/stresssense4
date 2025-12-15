export const dynamic = "force-dynamic";

import Link from "next/link";
import { listArticles } from "@/lib/resources";

type Props = { searchParams?: { category?: string; q?: string } };

export default async function ResourcesPage({ searchParams }: Props) {
  let articles: Awaited<ReturnType<typeof listArticles>> = [] as Awaited<ReturnType<typeof listArticles>>;
  try {
    articles = await listArticles(searchParams?.category, searchParams?.q);
  } catch (e) {
    console.warn("Resources page: failed to load articles", e);
    articles = [] as Awaited<ReturnType<typeof listArticles>>;
  }
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Resources</p>
        <h1 className="text-3xl font-semibold text-slate-900">Resources to help you talk about stress better</h1>
        <p className="text-sm text-slate-600">Guides, use cases, and product tips for StressSense.</p>
      </div>

      <form className="flex flex-wrap items-center justify-center gap-3">
        <input
          name="q"
          defaultValue={searchParams?.q}
          placeholder="Search articles"
          className="w-full max-w-sm rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <select
          name="category"
          defaultValue={searchParams?.category ?? ""}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All</option>
          <option value="Guide">Guide</option>
          <option value="Use case">Use case</option>
          <option value="Product update">Product update</option>
        </select>
        <button className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]">
          Filter
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((a: any) => (
          <Link
            key={a.id}
            href={`/resources/${a.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{a.category}</span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{a.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{a.description}</p>
            <p className="mt-3 text-xs font-semibold text-primary">Read article →</p>
          </Link>
        ))}
        {articles.length === 0 && <p className="text-sm text-slate-600">No articles yet.</p>}
      </div>
    </div>
  );
}
