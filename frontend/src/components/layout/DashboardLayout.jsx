import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Kanban,
  Package,
  FileText,
  Truck,
  ShoppingCart,
  Mail,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
} from "lucide-react";

const NavGroup = ({ label, children }) => (
  <div className="mb-6">
    <div className="px-4 mb-2 text-[10px] font-mono uppercase tracking-widest text-stone-400" data-testid={`nav-group-${label.toLowerCase()}`}>
      {label}
    </div>
    {children}
  </div>
);

const NavItem = ({ to, icon: Icon, label, testId }) => (
  <NavLink
    to={to}
    end={to === "/"}
    data-testid={testId}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2 text-sm border-l-2 ${
        isActive
          ? "border-brand-blue bg-stone-50 text-stone-950 font-medium"
          : "border-transparent text-stone-600 hover:bg-stone-50 hover:text-stone-950"
      }`
    }
  >
    <Icon className="w-4 h-4" strokeWidth={1.5} />
    <span>{label}</span>
  </NavLink>
);

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getBreadcrumb = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return ["Dashboard"];
    return parts.map(p => p.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  };

  return (
    <div className="min-h-screen flex bg-stone-50" data-testid="dashboard-layout">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-stone-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        data-testid="mobile-menu-toggle"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-white border-r border-stone-200 flex flex-col transition-transform`}
        data-testid="sidebar"
      >
        {/* Logo / Org */}
        <div className="px-4 py-5 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-blue flex items-center justify-center">
              <span className="text-white font-heading font-black text-sm">E</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-sm tracking-tight text-stone-950 truncate">
                ENTERPRISE OS
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 truncate">
                ERP × CRM
              </div>
            </div>
          </div>
        </div>

        {/* Org Switcher */}
        <div className="px-4 py-3 border-b border-stone-200">
          <div className="text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">Organization</div>
          <button className="w-full text-left flex items-center justify-between px-3 py-2 bg-stone-50 border border-stone-200 hover:border-stone-300" data-testid="org-switcher">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-950 truncate">{user?.name || "Org"}</div>
              <div className="font-mono text-[10px] text-stone-500 truncate">{user?.organization_id?.slice(0, 12)}</div>
            </div>
            <ChevronRight className="w-3 h-3 text-stone-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <NavGroup label="Overview">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard" />
          </NavGroup>

          <NavGroup label="CRM">
            <NavItem to="/crm/leads" icon={Users} label="Leads" testId="nav-leads" />
            <NavItem to="/crm/contacts" icon={UserCircle} label="Contacts" testId="nav-contacts" />
            <NavItem to="/crm/pipeline" icon={Kanban} label="Pipeline" testId="nav-pipeline" />
          </NavGroup>

          <NavGroup label="ERP">
            <NavItem to="/erp/inventory" icon={Package} label="Inventory" testId="nav-inventory" />
            <NavItem to="/erp/invoices" icon={FileText} label="Invoices" testId="nav-invoices" />
            <NavItem to="/erp/suppliers" icon={Truck} label="Suppliers" testId="nav-suppliers" />
            <NavItem to="/erp/purchase-orders" icon={ShoppingCart} label="Purchase Orders" testId="nav-purchase-orders" />
          </NavGroup>

          <NavGroup label="Operations">
            <NavItem to="/email" icon={Mail} label="Email Campaigns" testId="nav-email" />
            <NavItem to="/payments" icon={CreditCard} label="Payments" testId="nav-payments" />
            <NavItem to="/settings" icon={Settings} label="Settings" testId="nav-settings" />
          </NavGroup>
        </nav>

        {/* User Footer */}
        <div className="border-t border-stone-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-stone-950 flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-stone-950 truncate" data-testid="user-name">{user?.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-stone-500 truncate">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 border border-stone-200 hover:bg-stone-950 hover:text-white hover:border-stone-950"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
          <div className="flex items-center justify-between px-6 lg:px-8 py-4">
            <div className="ml-12 lg:ml-0">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-0.5">
                <span>{getBreadcrumb()[0]}</span>
                {getBreadcrumb().slice(1).map((p, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight className="w-3 h-3" />
                    <span>{p}</span>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="font-heading font-black text-xl tracking-tight text-stone-950" data-testid="page-title">
                {getBreadcrumb()[getBreadcrumb().length - 1]}
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">Tenant</div>
                <div className="text-xs font-medium text-stone-950 truncate max-w-[200px]">{user?.email}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
