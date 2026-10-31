"""Stripe payment routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

from core.config import STRIPE_API_KEY
from core.database import db
from core.security import get_current_user
from core.throttle import limiter
from models.schemas import PaymentCheckoutRequest

router = APIRouter(tags=["payments"])


def _stripe(request: Request) -> StripeCheckout:
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@router.post("/payments/checkout")
@limiter.limit("5/minute")
async def create_checkout_session(payment_data: PaymentCheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    host_url = payment_data.origin_url
    stripe_checkout = _stripe(request)

    success_url = f"{host_url}/payments/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payments"

    checkout_request = CheckoutSessionRequest(
        amount=payment_data.amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "organization_id": user["organization_id"],
            "description": payment_data.description,
        },
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "amount": payment_data.amount,
        "currency": "usd",
        "description": payment_data.description,
        "user_id": user["id"],
        "organization_id": user["organization_id"],
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc),
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    stripe_checkout = _stripe(request)
    status = await stripe_checkout.get_checkout_status(session_id)

    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"payment_status": status.payment_status, "status": status.status}},
    )
    return status


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    stripe_checkout = _stripe(request)

    webhook_response = await stripe_checkout.handle_webhook(body, signature)

    await db.payment_transactions.update_one(
        {"session_id": webhook_response.session_id},
        {"$set": {"payment_status": webhook_response.payment_status}},
    )
    return {"status": "success"}
