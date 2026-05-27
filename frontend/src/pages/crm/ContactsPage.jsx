import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Textarea } from "../../components/shared/UI";
import { toast } from "sonner";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", position: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/crm/contacts");
      setContacts(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/crm/contacts", form);
      toast.success("Contact added");
      setOpen(false);
      setForm({ name: "", email: "", company: "", phone: "", position: "", notes: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) {
        toast.error(e.response?.data?.detail || "Failed to add contact");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="contacts-page">
      <PageHeader
        title="Contacts"
        subtitle="CRM / 002"
        action={
          <PrimaryButton onClick={() => setOpen(true)} testId="new-contact-button">
            <Plus className="w-3.5 h-3.5" /> New Contact
          </PrimaryButton>
        }
      />

      <DataTable
        testId="contacts-table"
        emptyLabel="No contacts yet."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email", mono: true },
          { key: "position", label: "Position" },
          { key: "company", label: "Company" },
          { key: "phone", label: "Phone", mono: true },
        ]}
        rows={contacts}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New Contact" testId="contact-modal">
        <form onSubmit={submit}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="contact-name-input" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required data-testid="contact-email-input" /></Field>
          <Field label="Position"><Input value={form.position} onChange={set("position")} data-testid="contact-position-input" /></Field>
          <Field label="Company"><Input value={form.company} onChange={set("company")} data-testid="contact-company-input" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} data-testid="contact-phone-input" /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={set("notes")} data-testid="contact-notes-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="contact-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Adding..." : "Add Contact"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
