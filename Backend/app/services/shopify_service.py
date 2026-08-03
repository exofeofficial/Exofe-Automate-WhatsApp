# app/services/shopify_service.py
# Orchestrates the "Connect Shopify" OAuth flow, catalog sync, and
# mirroring completed WhatsApp orders back into the merchant's store.
# Talks to Shopify via app/ai/shopify_client.py, persistence via
# user_repository (connection) and product_repository (catalog).

import re
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai import shopify_client
from app.config import settings
from app.core.exceptions import AppError
from app.core.logger import get_logger
from app.repositories import order_repository, product_repository, user_repository

logger = get_logger(__name__)

STATE_ALGORITHM = "HS256"
STATE_EXPIRE_MINUTES = 10

SHOP_DOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9-]*\.myshopify\.com$")


def _normalize_shop(shop: str) -> str:
    shop = shop.strip().lower()
    if not SHOP_DOMAIN_RE.match(shop):
        raise AppError(400, "That doesn't look like a valid Shopify store domain (expected something.myshopify.com).")
    return shop


def build_install_url(business_id: str, shop: str) -> str:
    """The install link the dashboard's "Connect Shopify" button opens.
    ``state`` is a short-lived signed token (not a DB row) carrying which
    business/shop this install is for — decoded back in handle_callback."""
    if not settings.shopify_api_key or not settings.shopify_api_secret:
        raise AppError(500, "Shopify integration isn't fully configured on the server yet")

    shop = _normalize_shop(shop)
    state = jwt.encode(
        {
            "business_id": business_id,
            "shop": shop,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=STATE_EXPIRE_MINUTES),
        },
        settings.jwt_secret,
        algorithm=STATE_ALGORITHM,
    )
    return shopify_client.build_install_url(shop, state)


def handle_callback(db: Session, *, shop: str, code: str, state: str, query_params: dict) -> dict:
    """Verifies the OAuth callback came from Shopify and matches a live
    install we started, exchanges the code for a permanent token, and
    saves the connection. Returns the connected business row."""
    if not shopify_client.verify_oauth_hmac(query_params):
        raise AppError(403, "Invalid Shopify signature")

    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=[STATE_ALGORITHM])
    except JWTError:
        raise AppError(400, "This install link has expired — try connecting again from the dashboard.")

    if payload["shop"] != shop:
        raise AppError(400, "Shop mismatch — try connecting again from the dashboard.")
    business_id = payload["business_id"]

    existing = user_repository.get_business_by_shopify_shop(db, shop)
    if existing and existing["id"] != business_id:
        raise AppError(400, "This Shopify store is already connected to another Exofe business account.")

    access_token = shopify_client.exchange_code_for_token(shop, code)
    business = user_repository.update_shopify_connection(db, business_id, shop_domain=shop, access_token=access_token)

    shopify_client.register_uninstall_webhook(shop, access_token)

    return business


def get_status(db: Session, business_id: str) -> dict:
    business = user_repository.get_business_by_id(db, business_id)
    return {
        "connected": business["shopify_connected_at"] is not None,
        "shop_domain": business["shopify_shop_domain"],
        "connected_at": business["shopify_connected_at"].isoformat() if business["shopify_connected_at"] else None,
    }


def disconnect(db: Session, business_id: str) -> dict:
    return user_repository.clear_shopify_connection(db, business_id)


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html or "").strip()


def sync_catalog(db: Session, business_id: str) -> dict:
    """Pulls every product from the connected store and upserts it into
    Exofe's own catalog, matched by shopify_product_id so re-running this
    updates existing rows instead of duplicating them. Safe to call
    repeatedly (e.g. a "Sync now" button, or on a schedule later)."""
    business = user_repository.get_business_by_id(db, business_id)
    if not business["shopify_shop_domain"] or not business["shopify_access_token"]:
        raise AppError(400, "Connect Shopify first")

    shop = business["shopify_shop_domain"]
    access_token = business["shopify_access_token"]
    shopify_products = shopify_client.fetch_all_products(shop, access_token)

    for sp in shopify_products:
        category_id = None
        if sp.get("product_type"):
            category_id = product_repository.get_or_create_category(db, business_id, sp["product_type"])

        images = [img["src"] for img in sp.get("images", []) if img.get("src")]
        shopify_variants = sp.get("variants", [])
        # Shopify gives every product at least one variant, even ones the
        # merchant never set variants on — it's synthesized under a
        # single "Title" option, which isn't a real choice to show a
        # WhatsApp customer.
        has_variants = len(shopify_variants) > 1

        options = [] if not has_variants else [
            {"name": opt["name"], "values": opt.get("values", [])}
            for opt in sp.get("options", [])
            if opt.get("name") != "Title"
        ]

        first_variant = shopify_variants[0] if shopify_variants else {}
        variants = []
        if has_variants:
            for v in shopify_variants:
                option_values = [val for val in (v.get("option1"), v.get("option2"), v.get("option3")) if val]
                variants.append({
                    "option_values": option_values,
                    "sku": v.get("sku") or "",
                    "price": float(v.get("price") or 0),
                    "stock": max(int(v.get("inventory_quantity") or 0), 0),
                    "shopify_variant_id": str(v["id"]),
                })
            stock = sum(v["stock"] for v in variants)
        else:
            stock = max(int(first_variant.get("inventory_quantity") or 0), 0)

        product = {
            "name": sp["title"],
            "sku": first_variant.get("sku") or "",
            "description": _strip_html(sp.get("body_html", ""))[:5000],
            "price": float(first_variant.get("price") or 0),
            "compare_at_price": float(first_variant["compare_at_price"]) if first_variant.get("compare_at_price") else None,
            "stock": stock,
            "status": "active" if sp.get("status") == "active" else "draft",
            "has_variants": has_variants,
            "images": images,
            "options": options,
            "variants": variants,
        }

        product_repository.upsert_shopify_product(
            db,
            business_id=business_id,
            category_id=category_id,
            shopify_product_id=str(sp["id"]),
            product=product,
        )

    db.commit()
    return {"synced": len(shopify_products)}


def push_order_to_shopify(db: Session, business_id: str, order_id: str) -> None:
    """Best-effort mirror of a just-completed Exofe/WhatsApp order into
    the merchant's Shopify store, so their existing fulfillment/
    accounting keeps working. Never raises — a Shopify hiccup here must
    never undo or fail the real (already-committed) Exofe order."""
    try:
        business = user_repository.get_business_by_id(db, business_id)
        if not business["shopify_shop_domain"] or not business["shopify_access_token"]:
            return

        order = order_repository.get_order(db, business_id, order_id)
        rows = db.execute(
            text(
                """
                SELECT oi.quantity, oi.unit_price, p.name AS product_name, pv.shopify_variant_id
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                LEFT JOIN product_variants pv ON pv.id = oi.product_variant_id
                WHERE oi.order_id = :order_id
                """
            ),
            {"order_id": order_id},
        ).fetchall()

        line_items = []
        for r in rows:
            if r.shopify_variant_id:
                line_items.append({"variant_id": int(r.shopify_variant_id), "quantity": r.quantity})
            else:
                # Product wasn't synced from Shopify — still record it as
                # a custom line item so the order total lines up.
                line_items.append({
                    "title": r.product_name,
                    "quantity": r.quantity,
                    "price": str(r.unit_price),
                })

        payload = {
            "line_items": line_items,
            "financial_status": "pending" if order["payment_method"] == "cod" else "paid",
            "note": "Placed via Exofe WhatsApp AI",
            "phone": order["customer_phone"],
            "shipping_address": {
                "first_name": order["customer_name"] or "WhatsApp Customer",
                "address1": order["delivery_address"],
                "phone": order["customer_phone"],
            },
        }

        shopify_client.create_order(business["shopify_shop_domain"], business["shopify_access_token"], payload)
    except Exception as e:
        logger.error(f"Failed to push order {order_id} to Shopify for business {business_id}: {e}")
