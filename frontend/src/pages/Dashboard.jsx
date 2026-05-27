import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { TrendingUp, Users, Package, FileText, DollarSign, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

const Stat = ({ label, value, sub, accent, testId }) => (
  <div className="bg-white border border-stone-200 p-6 hover:-translate-y-0.5 transition-transform" data-testid={testId}>
    <div className="flex items-start justify-between mb-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</div>
      <div className={`w-1.5 h-1.5 ${accent || "bg-brand-blue"}`}></div>
    </div>
    <div className="font-heading font-black text-4xl tracking-tighter text-stone-950 mb-1 font-mono">{value}</div>
    <div className="text-xs text-stone-500">{sub}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/dashboard/stats");
        setStats(data);
      } catch (e) {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = [
    { month: "Jan", revenue: 12400, leads: 24 },
    { month: "Feb", revenue: 19800, leads: 32 },
    { month: "Mar", revenue: 16200, leads: 28 },
    { month: "Apr", revenue: 24500, leads: 45 },
    { month: "May", revenue: 28100, leads: 52 },
    { month: "Jun", revenue: 32400, leads: 61 },
  ];

  if (loading) {
    return <div className="font-mono text-xs text-stone-500" data-testid="dashboard-loading">LOADING DASHBOARD...</div>;
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Leads"
          value={stats?.total_leads ?? 0}
          sub="Total pipeline leads"
          accent="bg-brand-blue"
          testId="stat-leads"
        />
        <Stat
          label="Contacts"
          value={stats?.total_contacts ?? 0}
          sub="In directory"
          accent="bg-stone-950"
          testId="stat-contacts"
        />
        <Stat
          label="Open Deals"
          value={stats?.total_deals ?? 0}
          sub={`$${(stats?.total_deal_value ?? 0).toLocaleString()} pipeline`}
          accent="bg-brand-blue"
          testId="stat-deals"
        />
        <Stat
          label="Inventory"
          value={`$${(stats?.total_inventory_value ?? 0).toLocaleString()}`}
          sub="Stock value"
          accent="bg-brand-red"
          testId="stat-inventory"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-stone-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-1">Revenue</div>
              <div className="font-heading font-black text-2xl tracking-tight text-stone-950">Last 6 Months</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Total</div>
              <div className="font-heading font-black text-xl text-brand-blue">$133.4K</div>
            </div>
          </div>
          <div className="h-64" data-testid="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#E7E5E4" />
                <XAxis dataKey="month" stroke="#78716C" style={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis stroke="#78716C" style={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0C0A09',
                    border: 'none',
                    borderRadius: 0,
                    color: '#fff',
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="revenue" fill="#002FA7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-1">Pending</div>
          <div className="font-heading font-black text-2xl tracking-tight text-stone-950 mb-6">Operations Queue</div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
                <span className="text-sm text-stone-700">Pending Invoices</span>
              </div>
              <span className="font-mono text-lg font-bold text-stone-950" data-testid="pending-invoices">
                {stats?.pending_invoices ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
                <span className="text-sm text-stone-700">Purchase Orders</span>
              </div>
              <span className="font-mono text-lg font-bold text-stone-950" data-testid="pending-pos">
                {stats?.pending_pos ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-brand-red" strokeWidth={1.5} />
                <span className="text-sm text-stone-700">System Status</span>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-brand-red font-bold">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <span>System ID: enterprise-os.v1</span>
          <span>Last sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
