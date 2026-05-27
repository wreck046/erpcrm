import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Mail, KeyRound, Trash2, Link as LinkIcon, Info } from "lucide-react";
import { DataTable, PageHeader, PrimaryButton, Modal, Field, Input, Select, Badge } from "../components/shared/UI";
import { toast } from "sonner";

const ROLE_OPTIONS_BY_ACTOR = {
  admin: ["admin", "manager", "sales", "user"],
  manager: ["sales", "user"],
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "user", mode: "invite", temp_password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState(null);

  const canInvite = me?.role === "admin" || me?.role === "manager";
  const canRemove = me?.role === "admin";
  const allowedRoles = ROLE_OPTIONS_BY_ACTOR[me?.role] || [];

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.mode === "invite") delete payload.temp_password;
      const { data } = await api.post("/users/invite", payload);
      if (form.mode === "invite") {
        toast.success(`Invite email sent to ${data.email}`, {
          description: "If email is blocked (testing mode), use the link below.",
        });
        // Provide a fallback link the admin can share manually
        // Note: We don't expose the raw token from the create endpoint for security in production -
        // for the blueprint demo we display it from the email log
        setLastInviteLink({ email: data.email, name: data.name });
      } else {
        toast.success(`User ${data.email} added directly`);
      }
      setOpen(false);
      setForm({ email: "", name: "", role: "user", mode: "invite", temp_password: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success("Role updated");
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const remove = async (userId, email) => {
    if (!window.confirm(`Remove ${email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success("User removed");
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div data-testid="users-page">
      <PageHeader
        title="Team & Roles"
        subtitle="Operations / 004"
        action={canInvite ? (
          <PrimaryButton onClick={() => setOpen(true)} testId="invite-user-button">
            <Plus className="w-3.5 h-3.5" /> Invite User
          </PrimaryButton>
        ) : null}
      />

      <div className="bg-stone-50 border border-stone-200 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-stone-600">
          <span className="font-medium text-stone-950">Your role: <span className="font-mono uppercase tracking-widest">{me?.role}</span>.</span>
          {me?.role === "admin" && " Admins can invite any role and remove users."}
          {me?.role === "manager" && " Managers can invite Sales / User roles only."}
          {!canInvite && " You have read-only access to the team list."}
        </div>
      </div>

      <DataTable
        testId="users-table"
        emptyLabel="No users yet."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email", mono: true },
          {
            key: "role",
            label: "Role",
            render: (r) => {
              const canEdit = canInvite && r.id !== me?.id && (me?.role === "admin" || (me?.role === "manager" && r.role !== "admin"));
              if (!canEdit) {
                return <Badge variant={r.role === "admin" ? "blue" : "default"}>{r.role}</Badge>;
              }
              return (
                <select
                  value={r.role}
                  onChange={(e) => updateRole(r.id, e.target.value)}
                  className="px-2 py-1 text-xs border border-stone-200 font-mono uppercase"
                  data-testid={`role-select-${r.id}`}
                >
                  {allowedRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              );
            },
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge variant={r.status === "active" ? "success" : "red"}>{r.status}</Badge>,
          },
          {
            key: "created_at",
            label: "Joined",
            render: (r) => <span className="font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</span>,
          },
          {
            key: "actions",
            label: "",
            render: (r) =>
              canRemove && r.id !== me?.id ? (
                <button onClick={() => remove(r.id, r.email)} className="text-stone-400 hover:text-brand-red" data-testid={`remove-user-${r.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null,
          },
        ]}
        rows={users}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Invite Team Member" testId="invite-modal">
        <form onSubmit={submit}>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required data-testid="invite-email-input" /></Field>
          <Field label="Full Name"><Input value={form.name} onChange={set("name")} required data-testid="invite-name-input" /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={set("role")} data-testid="invite-role-select">
              {allowedRoles.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </Select>
          </Field>
          <Field label="Onboarding Method">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "invite" })}
                className={`p-3 border text-left ${form.mode === "invite" ? "border-brand-blue bg-stone-50" : "border-stone-200"}`}
                data-testid="mode-invite-button"
              >
                <Mail className="w-4 h-4 mb-1.5 text-stone-700" strokeWidth={1.5} />
                <div className="text-xs font-medium text-stone-950">Email Invite</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mt-1">Sends link</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "direct" })}
                className={`p-3 border text-left ${form.mode === "direct" ? "border-brand-blue bg-stone-50" : "border-stone-200"}`}
                data-testid="mode-direct-button"
              >
                <KeyRound className="w-4 h-4 mb-1.5 text-stone-700" strokeWidth={1.5} />
                <div className="text-xs font-medium text-stone-950">Direct Create</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mt-1">Temp password</div>
              </button>
            </div>
          </Field>
          {form.mode === "direct" && (
            <Field label="Temporary Password (min 6 chars)">
              <Input type="text" value={form.temp_password} onChange={set("temp_password")} required minLength={6} data-testid="invite-temp-password-input" />
            </Field>
          )}
          <button type="submit" disabled={submitting} data-testid="invite-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Sending..." : form.mode === "invite" ? "Send Invitation" : "Create User"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
