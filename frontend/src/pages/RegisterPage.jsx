import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    organization_name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-blue flex items-center justify-center">
              <span className="text-white font-heading font-black text-base">E</span>
            </div>
            <div className="font-heading font-bold text-sm tracking-tight text-stone-950">ENTERPRISE OS</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
            002 / Create Tenant
          </div>
          <h2 className="font-heading font-black text-3xl tracking-tight text-stone-950 mb-2">
            Start your organization.
          </h2>
          <p className="text-sm text-stone-500">
            Each registration creates a new isolated tenant.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              required
              data-testid="register-name-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={form.organization_name}
              onChange={set("organization_name")}
              required
              data-testid="register-org-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              data-testid="register-email-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              data-testid="register-password-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit-button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Tenant"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-stone-500 hover:text-brand-blue" data-testid="back-to-login-link">
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
