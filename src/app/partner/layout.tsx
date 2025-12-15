import "@/app/globals.css";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">StressSense Partner</div>
            <p className="text-xs text-slate-600">Partner portal</p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
