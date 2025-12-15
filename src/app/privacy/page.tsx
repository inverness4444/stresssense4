export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Privacy policy (placeholder)</h1>
        <p className="mt-4 text-sm text-slate-700">
          This is a placeholder privacy policy for StressSense. Replace this content with your actual policy details.
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem.
        </p>
        <p className="mt-3 text-sm text-slate-700">
          We care about your privacy and are committed to protecting personal data. More details will be added here as the product
          matures.
        </p>
        <div id="ai" className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold text-slate-900">AI features</h2>
          <p className="text-sm text-slate-700">
            StressSense uses AI to summarize survey results, suggest actions for managers, and power the in-product assistant.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Only aggregated survey data and anonymous comments are used for AI prompts. Individual identities are not shared.</li>
            <li>AI outputs are guidance, not medical or legal advice. Always review before acting.</li>
            <li>Admins can disable AI by setting AI_PROVIDER=none in environment configuration.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
