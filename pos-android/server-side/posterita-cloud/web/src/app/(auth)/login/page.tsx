import Link from "next/link";
import { Building2, Shield, ArrowRight } from "lucide-react";

export default function LoginPortalChooserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-white/10 rounded-full px-5 py-2 text-sm">
            <span className="font-semibold tracking-wide">Posterita Cloud</span>
            <span className="text-white/60">Choose your portal</span>
          </div>
          <h1 className="text-5xl font-bold mt-6">Two clear ways in</h1>
          <p className="text-white/70 mt-4 max-w-2xl mx-auto text-lg">
            Posterita account managers oversee the full portfolio. Business owners sign into their own customer workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/manager/login"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-6">
              <Shield className="text-red-300" size={28} />
            </div>
            <h2 className="text-2xl font-semibold">Account Manager Portal</h2>
            <p className="text-white/70 mt-3">
              For Posterita staff to oversee accounts, assign ownership, filter portfolio health, and enter customer accounts when support is needed.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-red-200 font-medium">
              Open manager login
              <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/customer/login"
            className="rounded-3xl border border-white/10 bg-white p-8 text-slate-900 hover:bg-slate-100 transition"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
              <Building2 className="text-blue-700" size={28} />
            </div>
            <h2 className="text-2xl font-semibold">Customer Portal</h2>
            <p className="text-slate-600 mt-3">
              For business owners and their teams to manage products, stores, users, reports, and AI-assisted setup inside their own account.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-700 font-medium">
              Open customer login
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
