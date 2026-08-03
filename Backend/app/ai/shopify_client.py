# app/ai/shopify_client.py
# Talks to Shopify's Admin API and implements the OAuth handshake for the
# "Connect Shopify" install flow. Mirrors whatsapp_client.py's shape:
# thin request wrappers here, orchestration lives in shopify_service.py.

import base64
import hashlib
import hmac
import urllib.parse

import httpx

from app.config import settings
from app.core.exceptions import AppError
from app.core.logger import get_logger

logger = get_logger(__name__)

API_VERSION = "2026-07"


def build_install_url(shop: str, state: str) -> str:
    """The URL the dashboard's "Connect Shopify" button redirects to —
    Shopify shows its own permission screen, then redirects back to
    /shopify/callback with a one-time authorization code."""
    params = {
        "client_id": settings.shopify_api_key,
        "scope": settings.shopify_scopes,
        "redirect_uri": f"{settings.backend_url}/shopify/callback",
        "state": state,
    }
    return f"https://{shop}/admin/oauth/authorize?{urllib.parse.urlencode(params)}"


def verify_oauth_hmac(params: dict) -> bool:
    """Confirms a /shopify/callback request actually came from Shopify —
    every OAuth redirect carries an hmac computed over the other query
    params, signed with our app's client secret."""
    if not settings.shopify_api_secret:
        logger.warning("SHOPIFY_API_SECRET not configured — skipping OAuth HMAC verification")
        return True
    received = params.get("hmac")
    if not received:
        return False
    message = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if k != "hmac")
    expected = hmac.new(settings.shopify_api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


def verify_webhook_hmac(body: bytes, hmac_header: str | None) -> bool:
    """Same idea as verify_oauth_hmac but for webhook POSTs, which sign
    the raw request body (base64, not hex) instead of a query string."""
    if not settings.shopify_api_secret:
        logger.warning("SHOPIFY_API_SECRET not configured — skipping webhook HMAC verification")
        return True
    if not hmac_header:
        return False
    digest = hmac.new(settings.shopify_api_secret.encode(), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode()
    return hmac.compare_digest(expected, hmac_header)


def exchange_code_for_token(shop: str, code: str) -> str:
    """One-time authorization code -> permanent Admin API access token.
    Unlike WhatsApp's short/long-lived token dance, Shopify hands back a
    token that's valid until the merchant uninstalls the app."""
    try:
        response = httpx.post(
            f"https://{shop}/admin/oauth/access_token",
            json={
                "client_id": settings.shopify_api_key,
                "client_secret": settings.shopify_api_secret,
                "code": code,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except httpx.HTTPError as e:
        logger.error(f"Shopify token exchange failed for {shop}: {e}")
        raise AppError(400, "Shopify rejected that installation — try connecting again.")


def _headers(access_token: str) -> dict:
    return {"X-Shopify-Access-Token": access_token, "Content-Type": "application/json"}


def _next_page_url(link_header: str | None) -> str | None:
    """Shopify paginates the products list via a standard Link header
    (?page_info cursor) — there's no page-number param to compute."""
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            return part[part.find("<") + 1 : part.find(">")]
    return None


def fetch_all_products(shop: str, access_token: str) -> list[dict]:
    """Every product in the store, across as many pages as it takes."""
    products: list[dict] = []
    url = f"https://{shop}/admin/api/{API_VERSION}/products.json?limit=250"
    while url:
        try:
            response = httpx.get(url, headers=_headers(access_token), timeout=20)
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error(f"Shopify product fetch failed for {shop}: {e}")
            raise AppError(400, "Couldn't fetch products from Shopify — try syncing again.")
        products.extend(response.json().get("products", []))
        url = _next_page_url(response.headers.get("Link"))
    return products


def create_order(shop: str, access_token: str, order_payload: dict) -> dict:
    """Mirrors a completed Exofe/WhatsApp order into the merchant's own
    Shopify store, so their existing fulfillment/accounting keeps working."""
    try:
        response = httpx.post(
            f"https://{shop}/admin/api/{API_VERSION}/orders.json",
            headers=_headers(access_token),
            json={"order": order_payload},
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["order"]
    except httpx.HTTPError as e:
        detail = e.response.text[:200] if isinstance(e, httpx.HTTPStatusError) else str(e)
        logger.error(f"Failed to create Shopify order for {shop}: {detail}")
        raise AppError(400, "Shopify didn't accept the order.")


def register_uninstall_webhook(shop: str, access_token: str) -> None:
    """The three GDPR compliance webhooks (customers/data_request,
    customers/redact, shop/redact) are configured as URLs in the Partner
    Dashboard's app setup, not registered per-shop via this API — only
    regular event webhooks like this one work this way."""
    try:
        response = httpx.post(
            f"https://{shop}/admin/api/{API_VERSION}/webhooks.json",
            headers=_headers(access_token),
            json={
                "webhook": {
                    "topic": "app/uninstalled",
                    "address": f"{settings.backend_url}/shopify/webhooks/app-uninstalled",
                    "format": "json",
                }
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as e:
        logger.error(f"Failed to register app/uninstalled webhook for {shop}: {e}")
