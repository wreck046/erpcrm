import React, { useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/shared/UI";
import { CreditCard, Info, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const PACKAGES = [
  { id: "starter", label: "Starter Tier", amount: 49, description: "Basic ERP features for small teams" },
  { id: "pro", label: "Pro Tier", amount: 149, description: "Full CRM + ERP + Email automation" },
  { id: "enterprise", label: "Enterprise Tier", amount: 499, description: "Multi-tenant, SSO, dedicated support" },
];

export default function PaymentsPage() {
  const [loading, setLoading] = useState(null);

  const initiate = async (pkg) => {
    setLoading(pkg.id);
    try {
      const { data } = await api.post("/payments/checkout", {
        amount: pkg.amount,
        description: `${pkg.label} subscription`,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      if (e.response?.status !== 429) {
        toast.error(e.response?.data?.detail || "Payment initialization failed. Check Stripe configuration.");
      }
      setLoading(null);
    }
  };

  return (
    <div data-testid="payments-page">
      <PageHeader title="Payments" subtitle="Operations / 002" />

      <div className="bg-stone-50 border border-stone-200 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-stone-600">
          <span className="font-medium text-stone-950">Payment Blueprint (Stripe-ready):</span> Predefined packages with backend-controlled pricing.
          Endpoints integrate with Stripe Checkout via the configured <span className="font-mono">STRIPE_API_KEY</span>.
          Throttled to <span className="font-mono">5 requests/min</span> per user.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGES.map((pkg, i) => (
          <div key={pkg.id} className="bg-white border border-stone-200 p-6 flex flex-col" data-testid={`package-${pkg.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Plan / {String(i + 1).padStart(3, "0")}
              </div>
              {i === 1 && <span className="text-[10px] font-mono uppercase tracking-widest bg-brand-blue text-white px-1.5 py-0.5">Popular</span>}
            </div>
            <h3 className="font-heading font-black text-xl tracking-tight text-stone-950 mb-1">{pkg.label}</h3>
            <div className="font-heading font-black text-4xl text-brand-blue mb-2 font-mono">
              ${pkg.amount}<span className="text-sm text-stone-500 font-body font-normal">/mo</span>
            </div>
            <p className="text-xs text-stone-500 mb-6 flex-1">{pkg.description}</p>
            <button
              onClick={() => initiate(pkg)}
              disabled={loading === pkg.id}
              data-testid={`pay-${pkg.id}-button`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-950 text-white text-sm font-medium hover:bg-brand-blue disabled:opacity-50"
            >
              {loading === pkg.id ? "Redirecting..." : (<>Pay with Stripe <ArrowRight className="w-3.5 h-3.5" /></>)}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-brand-red" strokeWidth={1.5} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Throttle Protection Active</span>
        </div>
        <p className="text-xs text-stone-500 max-w-2xl">
          Transaction-type endpoints are rate-limited per authenticated user to protect the system from request storms.
          A 429 response triggers an automatic toast notification with the retry window.
        </p>
      </div>
    </div>
  );
}
