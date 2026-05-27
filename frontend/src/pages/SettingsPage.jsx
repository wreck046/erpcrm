import React from "react";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/shared/UI";
import { Shield, Building2, User, Zap } from "lucide-react";

const Row = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-center py-3 border-b border-stone-200 last:border-0">
    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</span>
    <span className={`text-sm text-stone-950 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
  </div>
);

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
          <div className="flex items-center justify-between"><span>Email (SendGrid / Resend)</span><span className="text-stone-500 font-mono">BLUEPRINT</span></div>
          <div className="flex items-center justify-between"><span>Payment (Stripe Checkout)</span><span className="text-brand-blue font-mono">CONNECTED</span></div>
          <div className="flex items-center justify-between"><span>Multi-tenant Isolation</span><span className="text-brand-blue font-mono">ACTIVE</span></div>
          <div className="flex items-center justify-between"><span>Rate Limiting</span><span className="text-brand-blue font-mono">ACTIVE</span></div>
        </div>
      </div>
    </div>
  );
}
