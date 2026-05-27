import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Textarea, Badge } from "../../components/shared/UI";
import { toast } from "sonner";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", quantity: "", unit_price: "", category: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/erp/inventory");
      setItems(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, quantity: parseInt(form.quantity), unit_price: parseFloat(form.unit_price) };
      await api.post("/erp/inventory", payload);
      toast.success("Item added");
      setOpen(false);
      setForm({ name: "", sku: "", quantity: "", unit_price: "", category: "", description: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="inventory-page">
      <PageHeader
        title="Inventory"
        subtitle="ERP / 001"
        action={<PrimaryButton onClick={() => setOpen(true)} testId="new-item-button"><Plus className="w-3.5 h-3.5" /> New Item</PrimaryButton>}
      />

      <DataTable
        testId="inventory-table"
        emptyLabel="No inventory items."
        columns={[
          { key: "sku", label: "SKU", mono: true, render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
          { key: "name", label: "Name" },
          { key: "category", label: "Category", render: (r) => r.category ? <Badge>{r.category}</Badge> : "—" },
          { key: "quantity", label: "Qty", render: (r) => <span className="font-mono">{r.quantity}</span> },
          { key: "unit_price", label: "Unit", render: (r) => <span className="font-mono">${r.unit_price.toFixed(2)}</span> },
          { key: "total", label: "Total", render: (r) => <span className="font-mono font-bold text-brand-blue">${(r.quantity * r.unit_price).toFixed(2)}</span> },
        ]}
        rows={items}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New Inventory Item" testId="item-modal">
        <form onSubmit={submit}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="item-name-input" /></Field>
          <Field label="SKU"><Input value={form.sku} onChange={set("sku")} required data-testid="item-sku-input" /></Field>
          <Field label="Category"><Input value={form.category} onChange={set("category")} data-testid="item-category-input" /></Field>
          <Field label="Quantity"><Input type="number" value={form.quantity} onChange={set("quantity")} required data-testid="item-quantity-input" /></Field>
          <Field label="Unit Price (USD)"><Input type="number" step="0.01" value={form.unit_price} onChange={set("unit_price")} required data-testid="item-price-input" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={set("description")} data-testid="item-description-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="item-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Adding..." : "Add Item"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
