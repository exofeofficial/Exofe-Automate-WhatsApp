# app/api/v1/products.py
#
# Two routers in this file: `router` (/products) and `categories_router`
# (/categories, per Frontend/docs/API.md). One extra line is needed in
# app/api/v1/__init__.py to wire the second one in — see the comment at
# the bottom of this file.
#
# Every route requires auth and scopes to CurrentUser.business_id — never
# trust a business_id from the client, only from the verified JWT.

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.database.session import get_db
from app.models.product import (
    BulkDeleteRequest,
    CategoryListResponse,
    CategoryRenameRequest,
    CategoryRequest,
    CategorySingleResponse,
    ImportResultResponse,
    MessageResponse,
    ProductListResponse,
    ProductRequest,
    ProductSingleResponse,
)
from app.services import catalog_service
from app.services.catalog_service import ProductError

router = APIRouter(prefix="/products", tags=["products"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def _handle_product_error(exc: ProductError) -> HTTPException:
    detail: dict = {"message": exc.message}
    if exc.errors:
        detail["errors"] = exc.errors
    return HTTPException(status_code=exc.status_code, detail=detail)


def _require_business(user: CurrentUser) -> str:
    """Admin tokens have no business_id — every product/category route
    needs one, so fail clearly instead of scoping a query to `None`."""
    if not user.business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "This action requires a business account"},
        )
    return user.business_id


# ── GET /products ────────────────────────────────────────────────────────────

@router.get("", response_model=ProductListResponse)
def list_products(
    db: DbSession,
    user: CurrentUserDep,
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
):
    business_id = _require_business(user)
    products = catalog_service.get_products(
        db, business_id, search=search, category=category, status=status_filter
    )
    return ProductListResponse(products=products)


# ── POST /products ───────────────────────────────────────────────────────────

@router.post("", response_model=ProductSingleResponse, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductRequest, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        product = catalog_service.create_product(db, business_id=business_id, payload=body.model_dump())
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


# ── GET /products/{id} ───────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductSingleResponse)
def get_product(product_id: str, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        product = catalog_service.get_product_by_id(db, product_id, business_id)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


# ── PATCH /products/{id} ─────────────────────────────────────────────────────

@router.patch("/{product_id}", response_model=ProductSingleResponse)
def update_product(product_id: str, body: ProductRequest, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        product = catalog_service.update_product(
            db, product_id, business_id, payload=body.model_dump()
        )
    except ProductError as exc:
        raise _handle_product_error(exc)
    return ProductSingleResponse(product=product)


# ── DELETE /products/{id} ────────────────────────────────────────────────────
# Per API.md's REST shape. The frontend itself doesn't call this — both
# single and multi delete go through POST /products/bulk-delete below —
# but this stays available for any other consumer.

@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(product_id: str, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        catalog_service.delete_product(db, product_id, business_id)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return MessageResponse(message="Product deleted")


# ── POST /products/bulk-delete ───────────────────────────────────────────────
# What ProductsPage.tsx actually calls — always an array, even for one id.

@router.post("/bulk-delete", response_model=MessageResponse)
def bulk_delete_products(body: BulkDeleteRequest, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    deleted_count = catalog_service.bulk_delete_products(db, body.ids, business_id)
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "None of the selected products were found"},
        )
    return MessageResponse(message=f"{deleted_count} product(s) deleted")


# ── POST /products/import ────────────────────────────────────────────────────
# multipart/form-data, field name "file" — matches importProductsCsv() in
# api.ts, which can't go through the shared JSON request() helper.

@router.post("/import", response_model=ImportResultResponse)
async def import_products(db: DbSession, user: CurrentUserDep, file: UploadFile):
    business_id = _require_business(user)

    if file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Please upload a .csv file"},
        )

    content = await file.read()
    imported = catalog_service.import_products_csv(db, business_id, content)
    return ImportResultResponse(imported=imported)


# ── Categories: GET/POST /categories, PATCH/DELETE /categories/{id} ─────────

@categories_router.get("", response_model=CategoryListResponse)
def list_categories(db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    categories = catalog_service.get_categories(db, business_id)
    return CategoryListResponse(categories=categories)


@categories_router.post("", response_model=CategorySingleResponse, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryRequest, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        category = catalog_service.create_category(db, business_id, body.name)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return CategorySingleResponse(category=category)


@categories_router.patch("/{category_id}", response_model=CategorySingleResponse)
def rename_category(category_id: str, body: CategoryRenameRequest, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        category = catalog_service.rename_category(db, category_id, business_id, body.name)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return CategorySingleResponse(category=category)


@categories_router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(category_id: str, db: DbSession, user: CurrentUserDep):
    business_id = _require_business(user)
    try:
        catalog_service.delete_category(db, category_id, business_id)
    except ProductError as exc:
        raise _handle_product_error(exc)
    return MessageResponse(message="Category deleted")