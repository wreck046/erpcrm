import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Textarea, Select, Badge } from "../../components/shared/UI";
import { toast } from "sonner";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", status: "new", value: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/crm/leads");
      setLeads(data);
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, value: form.value ? parseFloat(form.value) : null };
      await api.post("/crm/leads", payload);
      toast.success("Lead created");
      setOpen(false);
      setForm({ name: "", email: "", company: "", phone: "", status: "new", value: "", notes: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) {
        toast.error(e.response?.data?.detail || "Failed to create lead");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = { new: "blue", contacted: "default", qualified: "success", lost: "red" };

  return (
    <div data-testid="leads-page">
      <PageHeader
        title="Leads"
        subtitle="CRM / 001"
        action={
          <PrimaryButton onClick={() => setOpen(true)} testId="new-lead-button">
            <Plus className="w-3.5 h-3.5" /> New Lead
          </PrimaryButton>
        }
      />

      <DataTable
        testId="leads-table"
        emptyLabel="No leads yet. Create your first lead."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email", mono: true },
          { key: "company", label: "Company" },
          { key: "phone", label: "Phone", mono: true },
          { key: "value", label: "Value", render: (r) => r.value ? <span className="font-mono">${r.value.toLocaleString()}</span> : <span className="text-stone-300">—</span> },
          { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "default"}>{r.status}</Badge> },
        ]}
        rows={leads}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New Lead" testId="lead-modal">
        <form onSubmit={submit}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="lead-name-input" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required data-testid="lead-email-input" /></Field>
          <Field label="Company"><Input value={form.company} onChange={set("company")} data-testid="lead-company-input" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} data-testid="lead-phone-input" /></Field>
          <Field label="Deal Value (USD)"><Input type="number" step="0.01" value={form.value} onChange={set("value")} data-testid="lead-value-input" /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")} data-testid="lead-status-select">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
            </Select>
          </Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={set("notes")} data-testid="lead-notes-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="lead-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Creating..." : "Create Lead"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
