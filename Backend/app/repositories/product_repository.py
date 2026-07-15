# app/repositories/product_repository.py
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.logger import get_logger

logger = get_logger(__name__)


# ── Category resolution helpers ─────────────────────────────────────────────

def get_or_create_category(db: Session, business_id: str, name: str) -> str:
    """Resolve a category name to its id, creating the row if it doesn't
    exist yet. This is what makes ProductFormPage.tsx's free-text "type a
    new name to create a category on the fly" work against a normalized
    categories table."""
    name = name.strip()
    row = db.execute(
        text("SELECT id FROM categories WHERE business_id = :business_id AND name = :name"),
        {"business_id": business_id, "name": name},
    ).fetchone()
    if row:
        return str(row.id)

    try:
        row = db.execute(
            text(
                "INSERT INTO categories (business_id, name) VALUES (:business_id, :name) RETURNING id"
            ),
            {"business_id": business_id, "name": name},
        ).fetchone()
        db.commit()
        return str(row.id)
    except Exception:
        db.rollback()
        row = db.execute(
            text("SELECT id FROM categories WHERE business_id = :business_id AND name = :name"),
            {"business_id": business_id, "name": name},
        ).fetchone()
        if not row:
            raise
        return str(row.id)


# ── Product aggregate assembly ──────────────────────────────────────────────

def _fetch_images(db: Session, product_ids: list[str]) -> dict[str, list[str]]:
    if not product_ids:
        return {}
    rows = db.execute(
        text(
            "SELECT product_id, url FROM product_images "
            "WHERE product_id = ANY(:ids) ORDER BY product_id, sort_order"
        ),
        {"ids": product_ids},
    ).fetchall()
    out: dict[str, list[str]] = {pid: [] for pid in product_ids}
    for row in rows:
        out.setdefault(str(row.product_id), []).append(row.url)
    return out


def _fetch_options(db: Session, product_ids: list[str]) -> dict[str, list[dict]]:
    if not product_ids:
        return {}
    rows = db.execute(
        text(
            "SELECT product_id, name, values FROM product_options "
            "WHERE product_id = ANY(:ids) ORDER BY product_id, sort_order"
        ),
        {"ids": product_ids},
    ).fetchall()
    out: dict[str, list[dict]] = {pid: [] for pid in product_ids}
    for row in rows:
        out.setdefault(str(row.product_id), []).append({"name": row.name, "values": row.values})
    return out


def _fetch_variants(db: Session, product_ids: list[str]) -> dict[str, list[dict]]:
    if not product_ids:
        return {}
    rows = db.execute(
        text(
            "SELECT id, product_id, option_values, sku, price, stock FROM product_variants "
            "WHERE product_id = ANY(:ids) ORDER BY product_id, created_at"
        ),
        {"ids": product_ids},
    ).fetchall()
    out: dict[str, list[dict]] = {pid: [] for pid in product_ids}
    for row in rows:
        out.setdefault(str(row.product_id), []).append(
            {
                "id": str(row.id),
                "option_values": row.option_values,
                "sku": row.sku,
                "price": float(row.price),
                "stock": row.stock,
            }
        )
    return out


def _assemble(rows: list[dict], db: Session) -> list[dict]:
    """Attach images/options/variants to bare product rows. Expects each
    row to already have a "category_name" key from the join (see
    _PRODUCT_SELECT below) — renamed to "category" here to match the
    frontend's field name."""
    ids = [str(r["id"]) for r in rows]
    images = _fetch_images(db, ids)
    options = _fetch_options(db, ids)
    variants = _fetch_variants(db, ids)

    result = []
    for r in rows:
        pid = str(r["id"])
        result.append(
            {
                **r,
                "id": pid,
                "business_id": str(r["business_id"]),
                "category": r.get("category_name") or "",
                "price": float(r["price"]),
                "compare_at_price": float(r["compare_at_price"]) if r["compare_at_price"] is not None else None,
                "images": images.get(pid, []),
                "options": options.get(pid, []),
                "variants": variants.get(pid, []),
            }
        )
    return result


_PRODUCT_SELECT = """
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
"""


# ── Product reads ────────────────────────────────────────────────────────────

def get_all_products(
    db: Session,
    business_id: str,
    *,
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
) -> list[dict]:
    clauses = ["p.business_id = :business_id"]
    params: dict = {"business_id": business_id}

    if search:
        clauses.append("p.name ILIKE :search")
        params["search"] = f"%{search}%"
    if category:
        clauses.append("c.name = :category")
        params["category"] = category
    if status:
        clauses.append("p.status = :status")
        params["status"] = status

    where = " AND ".join(clauses)
    rows = db.execute(
        text(f"{_PRODUCT_SELECT} WHERE {where} ORDER BY p.created_at DESC"), params
    ).fetchall()
    return _assemble([dict(row._mapping) for row in rows], db)


def get_product_by_id(db: Session, product_id: str, business_id: str) -> dict | None:
    row = db.execute(
        text(f"{_PRODUCT_SELECT} WHERE p.id = :product_id AND p.business_id = :business_id"),
        {"product_id": product_id, "business_id": business_id},
    ).fetchone()
    if not row:
        return None
    return _assemble([dict(row._mapping)], db)[0]


# ── Product writes ───────────────────────────────────────────────────────────

def _insert_images(db: Session, product_id: str, images: list[str]) -> None:
    for i, url in enumerate(images):
        db.execute(
            text(
                "INSERT INTO product_images (product_id, url, sort_order) "
                "VALUES (:product_id, :url, :sort_order)"
            ),
            {"product_id": product_id, "url": url, "sort_order": i},
        )


def _insert_options(db: Session, product_id: str, options: list[dict]) -> None:
    for i, opt in enumerate(options):
        db.execute(
            text(
                "INSERT INTO product_options (product_id, name, values, sort_order) "
                "VALUES (:product_id, :name, :values, :sort_order)"
            ),
            {"product_id": product_id, "name": opt["name"], "values": opt["values"], "sort_order": i},
        )


def _insert_variants(db: Session, product_id: str, variants: list[dict]) -> None:
    for v in variants:
        db.execute(
            text(
                "INSERT INTO product_variants (product_id, option_values, sku, price, stock) "
                "VALUES (:product_id, :option_values, :sku, :price, :stock)"
            ),
            {
                "product_id": product_id,
                "option_values": v["option_values"],
                "sku": v["sku"],
                "price": v["price"],
                "stock": v["stock"],
            },
        )


def create_product(db: Session, *, business_id: str, category_id: str | None, product: dict) -> dict:
    """`product` is a plain dict matching the products columns (minus
    business_id/category_id, passed separately) plus images/options/
    variants — built in catalog_service.py after resolving the category
    name and server-deriving price/stock for variant products."""
    row = db.execute(
        text(
            """
            INSERT INTO products
                (business_id, category_id, name, sku, description, price,
                 compare_at_price, stock, status, has_variants)
            VALUES
                (:business_id, :category_id, :name, :sku, :description, :price,
                 :compare_at_price, :stock, :status, :has_variants)
            RETURNING id
            """
        ),
        {
            "business_id": business_id,
            "category_id": category_id,
            "name": product["name"],
            "sku": product["sku"],
            "description": product["description"],
            "price": product["price"],
            "compare_at_price": product["compare_at_price"],
            "stock": product["stock"],
            "status": product["status"],
            "has_variants": product["has_variants"],
        },
    ).fetchone()
    product_id = str(row.id)

    _insert_images(db, product_id, product["images"])
    _insert_options(db, product_id, product["options"])
    _insert_variants(db, product_id, product["variants"])

    db.commit()
    return get_product_by_id(db, product_id, business_id)


def update_product(
    db: Session, product_id: str, business_id: str, *, category_id: str | None, product: dict
) -> dict | None:
    row = db.execute(
        text(
            """
            UPDATE products SET
                category_id = :category_id, name = :name, sku = :sku,
                description = :description, price = :price,
                compare_at_price = :compare_at_price, stock = :stock,
                status = :status, has_variants = :has_variants,
                updated_at = NOW()
            WHERE id = :id AND business_id = :business_id
            RETURNING id
            """
        ),
        {
            "id": product_id,
            "business_id": business_id,
            "category_id": category_id,
            "name": product["name"],
            "sku": product["sku"],
            "description": product["description"],
            "price": product["price"],
            "compare_at_price": product["compare_at_price"],
            "stock": product["stock"],
            "status": product["status"],
            "has_variants": product["has_variants"],
        },
    ).fetchone()

    if not row:
        db.rollback()
        return None

    db.execute(text("DELETE FROM product_images WHERE product_id = :id"), {"id": product_id})
    db.execute(text("DELETE FROM product_options WHERE product_id = :id"), {"id": product_id})
    db.execute(text("DELETE FROM product_variants WHERE product_id = :id"), {"id": product_id})

    _insert_images(db, product_id, product["images"])
    _insert_options(db, product_id, product["options"])
    _insert_variants(db, product_id, product["variants"])

    db.commit()
    return get_product_by_id(db, product_id, business_id)


def delete_product(db: Session, product_id: str, business_id: str) -> bool:
    # product_images/options/variants all cascade via ON DELETE CASCADE.
    result = db.execute(
        text("DELETE FROM products WHERE id = :product_id AND business_id = :business_id"),
        {"product_id": product_id, "business_id": business_id},
    )
    db.commit()
    return result.rowcount > 0


def bulk_delete_products(db: Session, product_ids: list[str], business_id: str) -> int:
    result = db.execute(
        text("DELETE FROM products WHERE id = ANY(:product_ids) AND business_id = :business_id"),
        {"product_ids": product_ids, "business_id": business_id},
    )
    db.commit()
    return result.rowcount


# ── Categories (API.md: /categories CRUD) ────────────────────────────────────
def _category_dict(row) -> dict:
    d = dict(row._mapping)
    d["id"] = str(d["id"])
    d["business_id"] = str(d["business_id"])
    return d


def get_categories(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text("SELECT * FROM categories WHERE business_id = :business_id ORDER BY name"),
        {"business_id": business_id},
    ).fetchall()
    return [_category_dict(row) for row in rows]

def create_category(db: Session, *, business_id: str, name: str) -> dict:
    """Can raise sqlalchemy.exc.IntegrityError on a duplicate
    (business_id, name) — the schema enforces it. Callers should catch it
    and translate to a clean error (see catalog_service.py)."""
    row = db.execute(
        text(
            "INSERT INTO categories (business_id, name) VALUES (:business_id, :name) RETURNING *"
        ),
        {"business_id": business_id, "name": name},
    ).fetchone()
    db.commit()
    return _category_dict(row)


def rename_category(db: Session, category_id: str, business_id: str, name: str) -> dict | None:
    row = db.execute(
        text(
            "UPDATE categories SET name = :name "
            "WHERE id = :category_id AND business_id = :business_id RETURNING *"
        ),
        {"name": name, "category_id": category_id, "business_id": business_id},
    ).fetchone()
    db.commit()
    return _category_dict(row) if row else None


def delete_category(db: Session, category_id: str, business_id: str) -> dict | None:
    """Products referencing this category are NOT deleted — ON DELETE SET
    NULL just orphans them. Returns which product ids got orphaned, or
    None if the category didn't exist / wasn't owned by this business."""
    affected = db.execute(
        text(
            "SELECT id FROM products WHERE category_id = :category_id AND business_id = :business_id"
        ),
        {"category_id": category_id, "business_id": business_id},
    ).fetchall()

    result = db.execute(
        text("DELETE FROM categories WHERE id = :category_id AND business_id = :business_id"),
        {"category_id": category_id, "business_id": business_id},
    )
    db.commit()

    if result.rowcount == 0:
        return None
    return {"orphaned_product_ids": [str(r.id) for r in affected]}