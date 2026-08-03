# app/api/v1/shopify.py
# Two audiences here: business-facing endpoints the dashboard's "Connect
# Shopify" card talks to (under /integrations/shopify/*, JWT-protected,
# mirrors app/api/v1/integrations.py's WhatsApp pattern), and
# Shopify-facing endpoints Shopify itself calls directly — the OAuth
# callback and webhooks (under /shopify/*), verified by HMAC instead of
# a JWT since there's no logged-in user on those requests.

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.ai import shopify_client
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.core.logger import get_logger
from app.database.session import get_db
from app.models.shopify import (
    ShopifyInstallRequest,
    ShopifyInstallResponse,
    ShopifyStatusResponse,
    ShopifySyncResponse,
)
from app.repositories import user_repository
from app.services import shopify_service

logger = get_logger(__name__)
router = APIRouter(tags=["shopify"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


# ── Business-facing (dashboard) ─────────────────────────────────────────────

@router.post("/integrations/shopify/install", response_model=ShopifyInstallResponse)
def install(payload: ShopifyInstallRequest, current: CurrentOwner) -> ShopifyInstallResponse:
    business_id = _require_business(current)
    url = shopify_service.build_install_url(business_id, payload.shop)
    return ShopifyInstallResponse(install_url=url)


@router.get("/integrations/shopify/status", response_model=ShopifyStatusResponse)
def get_status(db: DbSession, current: CurrentOwner) -> ShopifyStatusResponse:
    business_id = _require_business(current)
    return ShopifyStatusResponse(**shopify_service.get_status(db, business_id))


@router.post("/integrations/shopify/sync", response_model=ShopifySyncResponse)
def sync(db: DbSession, current: CurrentOwner) -> ShopifySyncResponse:
    business_id = _require_business(current)
    return ShopifySyncResponse(**shopify_service.sync_catalog(db, business_id))


@router.post("/integrations/shopify/disconnect", response_model=ShopifyStatusResponse)
def disconnect(db: DbSession, current: CurrentOwner) -> ShopifyStatusResponse:
    business_id = _require_business(current)
    shopify_service.disconnect(db, business_id)
    return ShopifyStatusResponse(connected=False, shop_domain=None, connected_at=None)


# ── Shopify-facing (OAuth + webhooks) ───────────────────────────────────────

@router.get("/shopify/callback")
def callback(request: Request, db: DbSession):
    """The merchant's browser lands here straight from Shopify's own
    permission screen — failures redirect back to the dashboard with an
    error flag instead of showing a raw JSON error, since there's no
    frontend JS involved to handle one."""
    params = dict(request.query_params)
    shop, code, state = params.get("shop"), params.get("code"), params.get("state")
    if not shop or not code or not state:
        return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?shopify=error")

    try:
        shopify_service.handle_callback(db, shop=shop, code=code, state=state, query_params=params)
    except AppError as e:
        logger.error(f"Shopify install failed for shop {shop}: {e.message}")
        return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?shopify=error")

    return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?shopify=connected")


@router.post("/shopify/webhooks/app-uninstalled")
async def webhook_app_uninstalled(request: Request, db: DbSession):
    body = await request.body()
    if not shopify_client.verify_webhook_hmac(body, request.headers.get("x-shopify-hmac-sha256")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    shop = request.headers.get("x-shopify-shop-domain")
    business = user_repository.get_business_by_shopify_shop(db, shop) if shop else None
    if business:
        user_repository.clear_shopify_connection(db, business["id"])
        logger.info(f"Shopify app uninstalled for business {business['id']} ({shop})")
    return {"status": "ok"}


# Mandatory GDPR compliance webhooks — every public Shopify app needs
# working endpoints for these three topics. Their URLs are pasted into
# the Partner Dashboard's app setup (Compliance webhooks section), they
# aren't registered per-shop via the API like app/uninstalled above.

@router.post("/shopify/webhooks/customers-data-request")
async def webhook_customers_data_request(request: Request):
    body = await request.body()
    if not shopify_client.verify_webhook_hmac(body, request.headers.get("x-shopify-hmac-sha256")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    # Exofe doesn't store Shopify customer records — only the connected
    # business's own product catalog is synced in — so there's nothing
    # to export for this request.
    return {"status": "ok"}


@router.post("/shopify/webhooks/customers-redact")
async def webhook_customers_redact(request: Request):
    body = await request.body()
    if not shopify_client.verify_webhook_hmac(body, request.headers.get("x-shopify-hmac-sha256")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    return {"status": "ok"}


@router.post("/shopify/webhooks/shop-redact")
async def webhook_shop_redact(request: Request, db: DbSession):
    """Sent ~48h after uninstall, asking us to erase the shop's data.
    Clears the connection if it's somehow still set (app/uninstalled
    should have already done this) — synced products stay, they're now
    just regular Exofe catalog entries the merchant manages directly."""
    body = await request.body()
    if not shopify_client.verify_webhook_hmac(body, request.headers.get("x-shopify-hmac-sha256")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    shop = request.headers.get("x-shopify-shop-domain")
    business = user_repository.get_business_by_shopify_shop(db, shop) if shop else None
    if business:
        user_repository.clear_shopify_connection(db, business["id"])
    return {"status": "ok"}
