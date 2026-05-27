import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }
    api.get(`/users/invitations/${token}`)
      .then(({ data }) => setInvite(data))
      .catch((e) => setError(e.response?.data?.detail || "Invalid invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/users/invitations/accept", { token, password });
      toast.success("Welcome aboard!");
      await refresh();
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="font-mono text-xs text-stone-500" data-testid="invite-loading">VERIFYING INVITATION...</div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8" data-testid="invite-error">
        <div className="bg-white border border-stone-200 p-10 max-w-md w-full text-center">
          <XCircle className="w-10 h-10 text-brand-red mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="font-heading font-black text-2xl tracking-tight text-stone-950 mb-2">
            Invalid Invitation
          </h2>
          <p className="text-sm text-stone-500 mb-6">{error || "This invitation link is invalid or expired."}</p>
          <Link to="/login" className="inline-block px-4 py-2 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8" data-testid="accept-invite-page">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-blue flex items-center justify-center">
              <span className="text-white font-heading font-black text-base">E</span>
            </div>
            <div className="font-heading font-bold text-sm tracking-tight text-stone-950">ENTERPRISE OS</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
            003 / Accept Invitation
          </div>
          <h2 className="font-heading font-black text-3xl tracking-tight text-stone-950 mb-3">
            You're invited.
          </h2>
        </div>

        <div className="bg-white border border-stone-200 p-5 mb-6">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">Email</div>
              <div className="text-stone-950 font-mono text-xs truncate" data-testid="invite-email">{invite.email}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">Organization</div>
              <div className="text-stone-950 truncate" data-testid="invite-org">{invite.organization_name}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">Role</div>
              <span className="inline-block px-2 py-0.5 bg-brand-blue text-white text-[10px] font-mono uppercase tracking-widest" data-testid="invite-role">{invite.role}</span>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">Expires</div>
              <div className="text-stone-950 font-mono text-xs">{new Date(invite.expires_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="accept-form">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Set Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              data-testid="accept-password-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              data-testid="accept-confirm-input"
              className="w-full px-3 py-2.5 bg-white border border-stone-200 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="accept-submit-button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50"
          >
            {submitting ? "Activating..." : (<>Accept &amp; Sign In <ArrowRight className="w-3.5 h-3.5" /></>)}
          </button>
        </form>
      </div>
    </div>
  );
}
