import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus, Trash2 } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Badge } from "../../components/shared/UI";
import { toast } from "sonner";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/erp/invoices");
      setInvoices(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const updateItem = (i, k, v) => {
    const items = [...form.items];
    items[i][k] = k === "description" ? v : parseFloat(v) || 0;
    items[i].total = items[i].quantity * items[i].unit_price;
    setForm({ ...form, items });
  };

  const addRow = () => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unit_price: 0, total: 0 }] });
  const removeRow = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/erp/invoices", form);
      toast.success("Invoice generated");
      setOpen(false);
      setForm({ client_name: "", client_email: "", items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }] });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div data-testid="invoices-page">
      <PageHeader
        title="Invoices"
        subtitle="ERP / 002"
        action={<PrimaryButton onClick={() => setOpen(true)} testId="new-invoice-button"><Plus className="w-3.5 h-3.5" /> New Invoice</PrimaryButton>}
      />

      <DataTable
        testId="invoices-table"
        emptyLabel="No invoices yet."
        columns={[
          { key: "invoice_number", label: "Invoice #", render: (r) => <span className="font-mono text-xs text-brand-blue font-bold">{r.invoice_number}</span> },
          { key: "client_name", label: "Client" },
          { key: "client_email", label: "Email", mono: true },
          { key: "total", label: "Total", render: (r) => <span className="font-mono font-bold">${r.total.toFixed(2)}</span> },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "paid" ? "success" : "blue"}>{r.status}</Badge> },
          { key: "created_at", label: "Date", render: (r) => <span className="font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
        ]}
        rows={invoices}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Generate Invoice" testId="invoice-modal">
        <form onSubmit={submit}>
          <Field label="Client Name"><Input value={form.client_name} onChange={set("client_name")} required data-testid="invoice-client-name" /></Field>
          <Field label="Client Email"><Input type="email" value={form.client_email} onChange={set("client_email")} required data-testid="invoice-client-email" /></Field>

          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2 flex justify-between">
              <span>Line Items</span>
              <button type="button" onClick={addRow} className="text-brand-blue" data-testid="add-line-item">+ Row</button>
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <input className="col-span-6 px-2 py-1.5 text-xs border border-stone-200" placeholder="Description" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} required />
                <input className="col-span-2 px-2 py-1.5 text-xs border border-stone-200 font-mono" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} required />
                <input className="col-span-3 px-2 py-1.5 text-xs border border-stone-200 font-mono" type="number" step="0.01" placeholder="Price" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} required />
                <button type="button" onClick={() => removeRow(i)} className="col-span-1 text-stone-400 hover:text-brand-red"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 pt-3 font-mono text-xs space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-stone-500"><span>Tax (10%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold text-brand-blue pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <button type="submit" disabled={submitting} data-testid="invoice-submit-button" className="mt-4 w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Generating..." : "Generate Invoice"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
