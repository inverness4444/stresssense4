import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm space-y-3">
          <p className="text-lg font-semibold text-slate-900">StressSense</p>
          <p className="text-sm text-slate-600">
            Stress intelligence платформа: опросы, AI-коуч, People & Comp, автоматизация и интеграции.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product</p>
            <Link href="/product" className="block hover:text-primary">
              Overview
            </Link>
            <Link href="/product#how-it-works" className="block hover:text-primary">
              How it works
            </Link>
            <Link href="/pricing" className="block hover:text-primary">
              Pricing
            </Link>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Solutions</p>
            <Link href="/product#for-hr" className="block hover:text-primary">
              HR teams
            </Link>
            <Link href="/manager/home" className="block hover:text-primary">
              Managers
            </Link>
            <Link href="/my/home" className="block hover:text-primary">
              Employees
            </Link>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resources</p>
            <Link href="/resource-hub" className="block hover:text-primary">
              Resource hub
            </Link>
            <Link href="/developers" className="block hover:text-primary">
              Developers
            </Link>
            <Link href="/help" className="block hover:text-primary">
              Help center
            </Link>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Company</p>
            <Link href="/privacy" className="block hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="block hover:text-primary">
              Terms
            </Link>
            <Link href="/signin" className="block hover:text-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl items-center justify-between px-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} StressSense by Quadrant. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-primary">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
