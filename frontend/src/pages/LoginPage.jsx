import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@erp-crm.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Left - Brand panel */}
      <div className="hidden lg:flex w-1/2 bg-stone-950 text-white p-12 flex-col justify-between" data-testid="brand-panel">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-brand-blue flex items-center justify-center">
              <span className="text-white font-heading font-black text-base">E</span>
            </div>
            <div>
              <div className="font-heading font-bold text-sm tracking-tight">ENTERPRISE OS</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">ERP × CRM</div>
            </div>
          </div>
          <h1 className="font-heading font-black text-5xl lg:text-6xl tracking-tighter leading-[0.95] mb-6">
            Run your<br />
            <span className="text-brand-red">operations</span><br />
            like a fortune.
          </h1>
          <p className="text-stone-400 leading-relaxed max-w-md font-body">
            An opinionated, multi-tenant ERP &amp; CRM blueprint. Built for clarity, speed and rigour. No fluff.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 font-mono text-[10px] uppercase tracking-widest">
          <div className="border-l-2 border-brand-blue pl-3">
            <div className="text-2xl font-heading font-black text-white">12</div>
            <div className="text-stone-500 mt-1">Modules</div>
          </div>
          <div className="border-l-2 border-brand-blue pl-3">
            <div className="text-2xl font-heading font-black text-white">∞</div>
            <div className="text-stone-500 mt-1">Tenants</div>
          </div>
          <div className="border-l-2 border-brand-red pl-3">
            <div className="text-2xl font-heading font-black text-white">RBAC</div>
            <div className="text-stone-500 mt-1">Secured</div>
          </div>
        </div>
      </div>

      {/* Right - Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              001 / Sign In
            </div>
            <h2 className="font-heading font-black text-3xl tracking-tight text-stone-950 mb-2">
              Welcome back.
            </h2>
            <p className="text-sm text-stone-500">
              Use the demo admin to explore. Or <Link to="/register" className="text-brand-blue underline" data-testid="register-link">create your tenant</Link>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm text-stone-950 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm text-stone-950 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-200">
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">Demo Credentials</div>
            <div className="font-mono text-xs text-stone-600 space-y-1">
              <div>admin@erp-crm.com</div>
              <div>admin123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
