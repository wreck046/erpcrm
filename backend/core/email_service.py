"""Email dispatch via Resend."""
import asyncio
import logging
from typing import Optional
import resend

from .config import RESEND_API_KEY, SENDER_EMAIL

logger = logging.getLogger(__name__)

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(to: str, subject: str, html: str) -> Optional[str]:
    """Send transactional email via Resend. Returns email_id or None on failure."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - email not sent to %s", to)
        return None
    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return result.get("id") if isinstance(result, dict) else None
    except Exception as e:
        logger.error("Resend send failed: %s", e)
        return None


def invite_email_html(inviter_name: str, organization_name: str, role: str, invite_link: str) -> str:
    return f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF9;padding:40px 0;font-family:Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border:1px solid #E7E5E4;">
      <tr><td style="padding:32px 40px;border-bottom:1px solid #E7E5E4;">
        <div style="font-size:11px;letter-spacing:2px;color:#78716C;text-transform:uppercase;font-family:monospace;">ENTERPRISE OS / INVITATION</div>
        <h1 style="font-size:28px;letter-spacing:-0.02em;color:#0C0A09;margin:8px 0 0 0;font-weight:900;">You're invited.</h1>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="font-size:14px;color:#44403C;line-height:1.6;margin:0 0 16px 0;">
          <strong>{inviter_name}</strong> invited you to join <strong>{organization_name}</strong> on Enterprise OS as <strong style="color:#002FA7;text-transform:uppercase;font-family:monospace;font-size:12px;letter-spacing:1px;">{role}</strong>.
        </p>
        <p style="font-size:14px;color:#44403C;line-height:1.6;margin:0 0 32px 0;">
          Click the button below to accept and set up your account. This link expires in 7 days.
        </p>
        <a href="{invite_link}" style="display:inline-block;background:#002FA7;color:#ffffff;padding:14px 28px;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.5px;">Accept Invitation →</a>
        <p style="font-size:11px;color:#78716C;line-height:1.6;margin:32px 0 0 0;font-family:monospace;">
          Or paste this URL: <br/>{invite_link}
        </p>
      </td></tr>
      <tr><td style="padding:20px 40px;border-top:1px solid #E7E5E4;background:#FAFAF9;">
        <div style="font-size:10px;letter-spacing:2px;color:#A8A29E;text-transform:uppercase;font-family:monospace;">Enterprise OS · ERP × CRM</div>
      </td></tr>
    </table>
  </td></tr>
</table>
"""
