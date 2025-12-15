import { prisma } from "@/lib/prisma";

export default async function HelpPage() {
  const articles = await prisma.article.findMany({
    where: { isHelpCenter: true },
    orderBy: { publishedAt: "desc" },
  });
  const gettingStarted = articles.filter((a) => a.category === "Getting started");
  const advanced = articles.filter((a) => a.category !== "Getting started");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Help center</h1>
        <p className="text-sm text-slate-600">Guides to launch stress pulses, read results, and manage your workspace.</p>
      </div>
      <Section title="Getting started" items={gettingStarted} />
      <Section title="Advanced features" items={advanced} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: { id: string; title: string; description: string | null }[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{a.title}</p>
            <p className="text-sm text-slate-600">{a.description}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No articles yet.</p>}
      </div>
    </section>
  );
}
