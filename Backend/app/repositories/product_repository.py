# app/repositories/product_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.logger import get_logger

logger = get_logger(__name__)

def get_all_products_by_business_id(db: Session, business_id: str, category_id: str | None = None) -> list[dict]:
    """Get all products for a business."""
    if category_id:
        rows = db.execute(text("""SELECT * FROM products WHERE business_id = :business_id AND category_id = :category_id"""),
            {"business_id": business_id, "category_id": category_id}).fetchall()
    else: 
        rows = db.execute(text("SELECT * FROM products WHERE business_id = :business_id"),
            {"business_id": business_id}).fetchall()
    return [dict(row._mapping) for row in rows]

def get_product_by_id(db: Session, product_id: str) -> dict | None:
    """Get one product by primary key."""
    row = db.execute(
        text("SELECT * FROM products WHERE id = :product_id"),{"product_id": product_id}
    ).fetchone()
    return dict(row._mapping) if row else None

def create_product_by_category(
    db: Session, *, name: str, description: str, 
    price: float, stock: int, is_active: bool
    ) -> None:
    """Create a product."""
    db.execute(text("""INSERT INTO products (name, description, price, stock, is_active)
        WHERE business_id = :business_id AND category_id = :category_id
        VALUES (:name, :description, :price, :stock, :is_active)
        """), {
            "name": name, "description": description, "price": price, "stock": stock, "is_active": is_active
        })
    db.commit()

_ALLOW_FIELDS_PRODUCT = frozenset({"name", "description", "price", "stock", "is_active"})
def update_product(db: Session, product_id: str, **fields) -> None:
    """Update a product."""
    invalid = set(fields) - _ALLOW_FIELDS_PRODUCT
    if invalid:
        logger.error(f"Invalid fields: {invalid}")
        raise ValueError(f"Disallowed fields: {invalid}")
    if not fields:
        return
    
    set_clause = ", ".join(f"{col} = :{col}" for col in fields)
    params = {**fields, "id": product_id}
    db.execute(text(f"""UPDATE products SET {set_clause}, updated_at = NOW() WHERE id = :id""",params))
    db.commit()

def delete_product(db: Session, product_id: str) -> None:
    """Delete a product."""
    db.execute(text("DELETE FROM products WHERE id = :product_id"),{"product_id": product_id})
    db.commit()

def get_category_by_business_id(db: Session, business_id: str) -> list[dict]:
    """Get all categories for a business."""
    rows = db.execute(text("SELECT * FROM categories WHERE business_id = :business_id"),{"business_id": business_id},).fetchall()
    return [dict(row._mapping) for row in rows]

def create_category(db: Session, *, name: str, business_id: str) -> None:
    """Create a category."""
    db.execute(text("INSERT INTO categories (name) VALUES (:name) WHERE business_id = :business_id"),{"name": name, "business_id": business_id})
    db.commit()


def rename_category(db: Session, category_id: str, name: str) -> None:
    """Rename a category."""
    db.execute(text("UPDATE categories SET name = :name WHERE id = :category_id"),{"name": name, "category_id": category_id})
    db.commit()

def delete_category(db: Session, category_id: str) -> None:
    """Delete a category."""
    db.execute(text("DELETE FROM categories WHERE id = :category_id"),{"category_id": category_id})
    db.commit()