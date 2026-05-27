import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Textarea } from "../../components/shared/UI";
import { toast } from "sonner";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/erp/suppliers");
      setSuppliers(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/erp/suppliers", form);
      toast.success("Supplier added");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", address: "", notes: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="suppliers-page">
      <PageHeader
        title="Suppliers"
        subtitle="ERP / 003"
        action={<PrimaryButton onClick={() => setOpen(true)} testId="new-supplier-button"><Plus className="w-3.5 h-3.5" /> New Supplier</PrimaryButton>}
      />

      <DataTable
        testId="suppliers-table"
        emptyLabel="No suppliers yet."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email", mono: true },
          { key: "phone", label: "Phone", mono: true },
          { key: "address", label: "Address" },
        ]}
        rows={suppliers}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New Supplier" testId="supplier-modal">
        <form onSubmit={submit}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="supplier-name-input" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required data-testid="supplier-email-input" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} data-testid="supplier-phone-input" /></Field>
          <Field label="Address"><Input value={form.address} onChange={set("address")} data-testid="supplier-address-input" /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={set("notes")} data-testid="supplier-notes-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="supplier-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Adding..." : "Add Supplier"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
