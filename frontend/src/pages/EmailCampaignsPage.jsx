import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Mail, Info } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Textarea, Select, Badge } from "../components/shared/UI";
import { toast } from "sonner";

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", content: "", recipient_type: "leads", recipient_emails: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/email/campaigns");
      setCampaigns(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.recipient_type === "custom") {
        payload.recipient_emails = payload.recipient_emails.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        delete payload.recipient_emails;
      }
      await api.post("/email/campaigns", payload);
      toast.success("Campaign created as draft");
      setOpen(false);
      setForm({ name: "", subject: "", content: "", recipient_type: "leads", recipient_emails: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="email-campaigns-page">
      <PageHeader
        title="Email Campaigns"
        subtitle="Operations / 001"
        action={<PrimaryButton onClick={() => setOpen(true)} testId="new-campaign-button"><Plus className="w-3.5 h-3.5" /> New Campaign</PrimaryButton>}
      />

      <div className="bg-stone-50 border border-stone-200 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-stone-600">
          <span className="font-medium text-stone-950">Email Automation Blueprint:</span> Campaigns are stored as drafts.
          Connect a provider (SendGrid / Resend) in Settings to enable bulk dispatch to leads, contacts, or custom lists.
        </div>
      </div>

      <DataTable
        testId="campaigns-table"
        emptyLabel="No campaigns yet."
        columns={[
          { key: "name", label: "Campaign Name" },
          { key: "subject", label: "Subject" },
          { key: "recipient_type", label: "Audience", render: (r) => <Badge>{r.recipient_type}</Badge> },
          { key: "sent_count", label: "Sent", render: (r) => <span className="font-mono">{r.sent_count}</span> },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "sent" ? "success" : "default"}>{r.status}</Badge> },
          { key: "created_at", label: "Created", render: (r) => <span className="font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
        ]}
        rows={campaigns}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New Email Campaign" testId="campaign-modal">
        <form onSubmit={submit}>
          <Field label="Campaign Name"><Input value={form.name} onChange={set("name")} required data-testid="campaign-name-input" /></Field>
          <Field label="Subject Line"><Input value={form.subject} onChange={set("subject")} required data-testid="campaign-subject-input" /></Field>
          <Field label="Audience">
            <Select value={form.recipient_type} onChange={set("recipient_type")} data-testid="campaign-audience-select">
              <option value="leads">All Leads</option>
              <option value="contacts">All Contacts</option>
              <option value="custom">Custom List</option>
            </Select>
          </Field>
          {form.recipient_type === "custom" && (
            <Field label="Custom Emails (comma separated)">
              <Textarea value={form.recipient_emails} onChange={set("recipient_emails")} placeholder="a@x.com, b@y.com" data-testid="campaign-recipients-input" />
            </Field>
          )}
          <Field label="Content"><Textarea value={form.content} onChange={set("content")} required data-testid="campaign-content-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="campaign-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Saving..." : "Save Draft"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
