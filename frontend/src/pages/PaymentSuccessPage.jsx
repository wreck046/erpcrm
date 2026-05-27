import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ state: "polling", data: null });
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus({ state: "error", data: null });
      return;
    }

    let cancelled = false;
    const MAX = 7;

    const poll = async (a = 0) => {
      if (cancelled || a >= MAX) {
        if (!cancelled) setStatus({ state: "timeout", data: null });
        return;
      }
      setAttempts(a + 1);
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setStatus({ state: "paid", data });
        } else if (data.status === "expired") {
          setStatus({ state: "expired", data });
        } else {
          setTimeout(() => poll(a + 1), 2000);
        }
      } catch (e) {
        setTimeout(() => poll(a + 1), 2000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center" data-testid="payment-success-page">
      <div className="bg-white border border-stone-200 p-10 max-w-md w-full">
        {status.state === "polling" && (
          <div className="text-center">
            <Clock className="w-10 h-10 text-stone-400 mx-auto mb-4" strokeWidth={1.5} />
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">Verifying / Attempt {attempts}/7</div>
            <h2 className="font-heading font-black text-2xl tracking-tight text-stone-950 mb-2">Checking Payment...</h2>
            <p className="text-sm text-stone-500">Polling Stripe for confirmation.</p>
          </div>
        )}
        {status.state === "paid" && (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-brand-blue mx-auto mb-4" strokeWidth={1.5} />
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">Payment Confirmed</div>
            <h2 className="font-heading font-black text-2xl tracking-tight text-stone-950 mb-2">Thank you.</h2>
            <p className="text-sm text-stone-500 mb-1">Amount: <span className="font-mono">${(status.data.amount_total / 100).toFixed(2)}</span></p>
            <p className="text-xs text-stone-400 mb-6 font-mono">{sessionId?.slice(0, 24)}...</p>
            <Link to="/" className="inline-block px-4 py-2 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950" data-testid="back-to-dashboard">
              Return to Dashboard
            </Link>
          </div>
        )}
        {(status.state === "expired" || status.state === "error" || status.state === "timeout") && (
          <div className="text-center">
            <XCircle className="w-10 h-10 text-brand-red mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-heading font-black text-2xl tracking-tight text-stone-950 mb-2">
              {status.state === "expired" ? "Session Expired" : status.state === "timeout" ? "Verification Timed Out" : "Invalid Session"}
            </h2>
            <p className="text-sm text-stone-500 mb-6">Please try again from the Payments page.</p>
            <Link to="/payments" className="inline-block px-4 py-2 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950">
              Back to Payments
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
