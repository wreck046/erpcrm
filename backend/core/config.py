"""Centralized environment configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Admin seeding
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@erp-crm.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# Stripe
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

# Resend
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# Frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

# Roles
VALID_ROLES = ["admin", "manager", "sales", "user"]


def assignable_roles(actor_role: str):
    """Manager can only assign sales/user. Admin can assign all roles."""
    if actor_role == "admin":
        return VALID_ROLES
    if actor_role == "manager":
        return ["sales", "user"]
    return []
