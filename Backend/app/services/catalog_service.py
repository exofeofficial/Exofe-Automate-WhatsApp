# app/services/catalog_service.py

import csv
import io

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.repositories import product_repository

logger = get_logger(__name__)


class ProductError(Exception):
    def __init__(self, message: str, status_code: int = 400, errors: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.errors = errors
        super().__init__(message)


def _normalize_product_dict(payload: dict) -> dict:
    """Take a validated ProductRequest.model_dump() and return the plain
    dict the repository expects, with variant-derived fields enforced
    server-side (never trust the client's computed aggregates)."""
    variants = payload["variants"]
    options = payload["options"]
    has_variants = payload["has_variants"]

    if has_variants:
        price = min(v["price"] for v in variants)
        stock = sum(v["stock"] for v in variants)
        sku = ""
        compare_at_price = None
    else:
        price = payload["price"]
        stock = payload["stock"]
        sku = payload["sku"]
        compare_at_price = payload["compare_at_price"]
        options = []
        variants = []

    return {
        "name": payload["name"],
        "sku": sku,
        "description": payload["description"],
        "price": price,
        "compare_at_price": compare_at_price,
        "stock": stock,
        "status": payload["status"],
        "has_variants": has_variants,
        "images": payload["images"],
        "options": options,
        "variants": variants,
    }


# ── Products ─────────────────────────────────────────────────────────────────

def get_products(
    db: Session,
    business_id: str,
    *,
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
) -> list[dict]:
    return product_repository.get_all_products(
        db, business_id, search=search, category=category, status=status
    )


def get_product_by_id(db: Session, product_id: str, business_id: str) -> dict:
    product = product_repository.get_product_by_id(db, product_id, business_id)
    if not product:
        raise ProductError("Product not found", status_code=404)
    return product


def create_product(db: Session, *, business_id: str, payload: dict) -> dict:
    category_id = product_repository.get_or_create_category(db, business_id, payload["category"])
    product = _normalize_product_dict(payload)
    return product_repository.create_product(
        db, business_id=business_id, category_id=category_id, product=product
    )


def update_product(db: Session, product_id: str, business_id: str, *, payload: dict) -> dict:
    category_id = product_repository.get_or_create_category(db, business_id, payload["category"])
    product = _normalize_product_dict(payload)
    updated = product_repository.update_product(
        db, product_id, business_id, category_id=category_id, product=product
    )
    if not updated:
        raise ProductError("Product not found", status_code=404)
    return updated


def delete_product(db: Session, product_id: str, business_id: str) -> None:
    deleted = product_repository.delete_product(db, product_id, business_id)
    if not deleted:
        raise ProductError("Product not found", status_code=404)


def bulk_delete_products(db: Session, product_ids: list[str], business_id: str) -> int:
    return product_repository.bulk_delete_products(db, product_ids, business_id)


def import_products_csv(db: Session, business_id: str, file_content: bytes) -> int:
    """Expected columns, in this order (per ImportCsvModal.tsx): name,
    category, price, stock. First row is a header. Imported products are
    always created as drafts."""
    text_content = file_content.decode("utf-8-sig")  # -sig handles a BOM from Excel exports
    reader = csv.reader(io.StringIO(text_content))

    rows = list(reader)
    if rows and rows[0] and rows[0][0].strip().lower() == "name":
        rows = rows[1:]  # drop header

    imported = 0
    for row in rows:
        if not row or not row[0].strip():
            continue
        try:
            name, category, price_str, stock_str = (row + ["", "", "", ""])[:4]
            name = name.strip()
            category = category.strip()
            if not name or not category:
                continue
            price = float(price_str.strip() or 0)
            stock = int(float(stock_str.strip() or 0))
            if price < 0 or stock < 0:
                continue
        except (ValueError, IndexError):
            logger.warning("Skipping malformed CSV row during product import: %r", row)
            continue

        category_id = product_repository.get_or_create_category(db, business_id, category)
        product_repository.create_product(
            db,
            business_id=business_id,
            category_id=category_id,
            product={
                "name": name,
                "sku": "",
                "description": "",
                "price": price,
                "compare_at_price": None,
                "stock": stock,
                "status": "draft",
                "has_variants": False,
                "images": [],
                "options": [],
                "variants": [],
            },
        )
        imported += 1

    return imported


# ── Categories ───────────────────────────────────────────────────────────────

def get_categories(db: Session, business_id: str) -> list[dict]:
    return product_repository.get_categories(db, business_id)


def create_category(db: Session, business_id: str, name: str) -> dict:
    try:
        return product_repository.create_category(db, business_id=business_id, name=name.strip())
    except IntegrityError:
        db.rollback()
        raise ProductError(
            "A category with this name already exists",
            status_code=409,
            errors={"name": "This category already exists"},
        )


def rename_category(db: Session, category_id: str, business_id: str, name: str) -> dict:
    try:
        category = product_repository.rename_category(db, category_id, business_id, name.strip())
    except IntegrityError:
        db.rollback()
        raise ProductError(
            "A category with this name already exists",
            status_code=409,
            errors={"name": "This category already exists"},
        )
    if not category:
        raise ProductError("Category not found", status_code=404)
    return category


def delete_category(db: Session, category_id: str, business_id: str) -> dict:
    result = product_repository.delete_category(db, category_id, business_id)
    if result is None:
        raise ProductError("Category not found", status_code=404)
    return result