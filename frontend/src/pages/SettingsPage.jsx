import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { PageHeader } from "../components/shared/UI";
import { Shield, Building2, User, Zap, Mail, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";

const Row = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-center py-3 border-b border-stone-200 last:border-0">
    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</span>
    <span className={`text-sm text-stone-950 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
  </div>
);

const EmailConfigPanel = () => {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.get("/email/config").then(({ data }) => setCfg(data)).catch(() => {});
  }, []);

  if (!cfg) return null;

  const ok = cfg.enabled && !cfg.is_default_sandbox;
  const accent = !cfg.enabled ? "bg-brand-red" : cfg.is_default_sandbox ? "bg-stone-500" : "bg-brand-blue";

  return (
    <div className="bg-white border border-stone-200 p-6 lg:col-span-2" data-testid="email-config-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
          <h3 className="font-heading font-bold text-lg tracking-tight text-stone-950">Email Configuration</h3>
        </div>
        <div className={`flex items-center gap-2 px-2 py-1 ${accent} text-white font-mono text-[10px] uppercase tracking-widest`}>
          {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {!cfg.enabled ? "Disabled" : cfg.is_default_sandbox ? "Sandbox" : "Production"}
        </div>
      </div>

      <Row label="Provider" value="Resend" mono />
      <Row label="API Key" value={cfg.enabled ? "Configured" : "Missing"} mono />
      <Row label="Sender" value={cfg.sender} mono />
      <Row label="Domain" value={cfg.sender.split("@")[1] || "—"} mono />

      <div className="mt-5 p-4 bg-stone-50 border border-stone-200">
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">Status</div>
        <p className="text-xs text-stone-700 leading-relaxed">{cfg.note}</p>
      </div>

      {cfg.is_default_sandbox && (
        <div className="mt-5 pt-5 border-t border-stone-200">
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-3">
            Steps to send invites to anyone
          </div>
          <ol className="space-y-3 text-xs text-stone-700">
            <li className="flex gap-3">
              <span className="font-mono text-stone-400 w-5 flex-shrink-0">01</span>
              <span>
                Go to{" "}
                <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-brand-blue underline inline-flex items-center gap-1" data-testid="resend-domains-link">
                  resend.com/domains <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and add your domain (e.g. <span className="font-mono">yourcompany.com</span>).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-stone-400 w-5 flex-shrink-0">02</span>
              <span>Add the SPF + DKIM TXT records Resend provides to your DNS host. Verification usually takes 5–60 minutes.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-stone-400 w-5 flex-shrink-0">03</span>
              <span>
                Edit <span className="font-mono">backend/.env</span> and set{" "}
                <span className="font-mono">SENDER_EMAIL=noreply@yourcompany.com</span> (must match the verified domain).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-stone-400 w-5 flex-shrink-0">04</span>
              <span>
                Restart the backend:{" "}
                <span className="font-mono bg-stone-950 text-white px-1.5 py-0.5">sudo supervisorctl restart backend</span>
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Operations / 003" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
            <h3 className="font-heading font-bold text-lg tracking-tight text-stone-950">Profile</h3>
          </div>
          <Row label="Name" value={user?.name} />
          <Row label="Email" value={user?.email} mono />
          <Row label="Role" value={<span className="px-2 py-0.5 bg-brand-blue text-white text-[10px] font-mono uppercase tracking-widest">{user?.role}</span>} />
          <Row label="User ID" value={user?.id?.slice(0, 16)} mono />
        </div>

        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
            <h3 className="font-heading font-bold text-lg tracking-tight text-stone-950">Organization</h3>
          </div>
          <Row label="Tenant ID" value={user?.organization_id?.slice(0, 24)} mono />
          <Row label="Tier" value="Default" />
          <Row label="Multi-tenant" value="Active" />
        </div>

        <EmailConfigPanel />

        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
            <h3 className="font-heading font-bold text-lg tracking-tight text-stone-950">Security</h3>
          </div>
          <Row label="Authentication" value="JWT (HTTPOnly cookie)" />
          <Row label="Token Expiry" value="24 hours" />
          <Row label="RBAC" value="Enabled" />
          <Row label="Password Hashing" value="bcrypt" mono />
        </div>

        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-brand-red" strokeWidth={1.5} />
            <h3 className="font-heading font-bold text-lg tracking-tight text-stone-950">Throttling</h3>
          </div>
          <Row label="Strategy" value="Per-user (JWT key)" />
          <Row label="Auth endpoints" value="10 / min" mono />
          <Row label="General writes" value="60 / min" mono />
          <Row label="Invoices / POs" value="20 / min" mono />
          <Row label="Payments" value="5 / min" mono />
        </div>
      </div>

      <div className="mt-8 p-4 bg-stone-50 border border-stone-200">
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">Integration Status</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between"><span>Email (Resend)</span><span className="text-brand-blue font-mono">CONNECTED</span></div>
          <div className="flex items-center justify-between"><span>Payment (Stripe Checkout)</span><span className="text-brand-blue font-mono">CONNECTED</span></div>
          <div className="flex items-center justify-between"><span>Multi-tenant Isolation</span><span className="text-brand-blue font-mono">ACTIVE</span></div>
          <div className="flex items-center justify-between"><span>Rate Limiting</span><span className="text-brand-blue font-mono">ACTIVE</span></div>
        </div>
      </div>
    </div>
  );
}
