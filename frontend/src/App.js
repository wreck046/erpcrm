import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import LeadsPage from "./pages/crm/LeadsPage";
import ContactsPage from "./pages/crm/ContactsPage";
import PipelinePage from "./pages/crm/PipelinePage";
import InventoryPage from "./pages/erp/InventoryPage";
import InvoicesPage from "./pages/erp/InvoicesPage";
import SuppliersPage from "./pages/erp/SuppliersPage";
import PurchaseOrdersPage from "./pages/erp/PurchaseOrdersPage";
import EmailCampaignsPage from "./pages/EmailCampaignsPage";
import PaymentsPage from "./pages/PaymentsPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import SettingsPage from "./pages/SettingsPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="font-mono text-xs text-stone-500" data-testid="auth-loading">LOADING...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <div className="App font-body">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ style: { borderRadius: '2px', border: '1px solid #E7E5E4' } }} />
          <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="crm/leads" element={<LeadsPage />} />
              <Route path="crm/contacts" element={<ContactsPage />} />
              <Route path="crm/pipeline" element={<PipelinePage />} />
              <Route path="erp/inventory" element={<InventoryPage />} />
              <Route path="erp/invoices" element={<InvoicesPage />} />
              <Route path="erp/suppliers" element={<SuppliersPage />} />
              <Route path="erp/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="email" element={<EmailCampaignsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="payments/success" element={<PaymentSuccessPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
