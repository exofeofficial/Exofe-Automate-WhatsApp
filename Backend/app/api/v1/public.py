# app/api/v1/public.py
# The public REST API — what a business's own developer connects their
# custom website/app to, authenticated with an API key (see
# core/dependencies.get_business_from_api_key) minted from the
# Developers section of Settings (developers.py) instead of a login
# token. Deliberately thin: reuses the exact same service functions the
# dashboard itself calls, so behavior never drifts between the two.
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_business_from_api_key
from app.database.session import get_db
from app.models.product import (
    MessageResponse,
    ProductListResponse,
    ProductRequest,
    ProductSingleResponse,
)
from app.models.settings import DeliverySettings, DeliveryWrapper
from app.services import catalog_service, settings_service
from app.services.catalog_service import ProductError

router = APIRouter(prefix="/public", tags=["public-api"])

DbSession = Annotated[Session, Depends(get_db)]
BusinessId = Annotated[str, Depends(get_business_from_api_key)]


def _handle_product_error(exc: ProductError) -> HTTPException:
    detail: dict = {"message": exc.message}
    if exc.errors:
        detail["errors"] = exc.errors
    return HTTPException(status_code=exc.status_code, detail=detail)


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products", response_model=ProductListResponse)
def list_products(
    db: DbSession,
    business_id: BusinessId,
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
):
    products = catalog_service.get_products(db, business_id, search=search, category=category, status=status_filter)
    return ProductListResponse(products=products)


@router.get("/products/{product_id}", response_model=ProductSingleResponse)
def get_product(product_id: str, db: DbSession, business_id: BusinessId):
    try:
        product = catalog_service.get_product_by_id(db, product_id, business_id)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


@router.post("/products", response_model=ProductSingleResponse, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductRequest, db: DbSession, business_id: BusinessId):
    try:
        product = catalog_service.create_product(db, business_id=business_id, payload=body.model_dump())
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


@router.patch("/products/{product_id}", response_model=ProductSingleResponse)
def update_product(product_id: str, body: ProductRequest, db: DbSession, business_id: BusinessId):
    try:
        product = catalog_service.update_product(db, product_id, business_id, payload=body.model_dump())
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


@router.delete("/products/{product_id}", response_model=MessageResponse)
def delete_product(product_id: str, db: DbSession, business_id: BusinessId):
    try:
        catalog_service.delete_product(db, product_id, business_id)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return MessageResponse(message="Product deleted")


# ── Shipping ──────────────────────────────────────────────────────────────────
# Reuses the same "delivery" settings the dashboard's Settings page shows —
# shipping areas, charge, estimated time, COD/pickup — under a name a
# storefront developer will actually recognize.

@router.get("/shipping", response_model=DeliveryWrapper)
def get_shipping(db: DbSession, business_id: BusinessId) -> DeliveryWrapper:
    settings = settings_service.get_settings(db, business_id)
    return DeliveryWrapper(delivery=settings.delivery)


@router.patch("/shipping", response_model=DeliveryWrapper)
def update_shipping(payload: DeliverySettings, db: DbSession, business_id: BusinessId) -> DeliveryWrapper:
    return DeliveryWrapper(delivery=settings_service.update_delivery(db, business_id, payload))
