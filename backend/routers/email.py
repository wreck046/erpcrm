"""Email campaign routes + email configuration status."""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, Request

from core.config import RESEND_API_KEY, SENDER_EMAIL
from core.database import db
from core.security import get_current_user
from core.throttle import limiter
from models.schemas import EmailCampaign, EmailCampaignCreate, EmailConfigStatus

router = APIRouter(prefix="/email", tags=["email"])


@router.post("/campaigns", response_model=EmailCampaign)
@limiter.limit("60/minute")
async def create_email_campaign(request: Request, campaign_data: EmailCampaignCreate, user: dict = Depends(get_current_user)):
    campaign_doc = campaign_data.model_dump()
    campaign_doc["organization_id"] = user["organization_id"]
    campaign_doc["status"] = "draft"
    campaign_doc["sent_count"] = 0
    campaign_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.email_campaigns.insert_one(campaign_doc)
    campaign_doc["id"] = str(result.inserted_id)
    return EmailCampaign(**campaign_doc)


@router.get("/campaigns", response_model=List[EmailCampaign])
async def get_email_campaigns(user: dict = Depends(get_current_user)):
    campaigns = await db.email_campaigns.find({"organization_id": user["organization_id"]}).to_list(1000)
    for campaign in campaigns:
        campaign["id"] = str(campaign.pop("_id"))
    return campaigns


@router.get("/config", response_model=EmailConfigStatus)
async def get_email_config(user: dict = Depends(get_current_user)):
    """Status of the Resend email integration for the Settings page."""
    is_default = SENDER_EMAIL.endswith("@resend.dev")
    if not RESEND_API_KEY:
        note = "Resend API key is not configured. Add RESEND_API_KEY to backend/.env."
    elif is_default:
        note = (
            "Sandbox mode: emails are delivered only to your Resend account email. "
            "Verify a domain at resend.com/domains, then update SENDER_EMAIL in backend/.env."
        )
    else:
        note = f"Custom domain in use ({SENDER_EMAIL.split('@')[-1]}). Emails can be sent to anyone."
    return EmailConfigStatus(
        enabled=bool(RESEND_API_KEY),
        sender=SENDER_EMAIL,
        is_default_sandbox=is_default,
        note=note,
    )
