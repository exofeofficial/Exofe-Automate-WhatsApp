# repositories/order_repository.py
# Raw SQL queries for the orders and order_items tables.

from sqlalchemy import text
from sqlalchemy.orm import Session

def list_orders(
    db: Session, business_id: str, *, status: str | None = None, search: str | None = None
) -> list[dict]:
    query = """
        SELECT o.*, c.name AS customer_name, c.whatsapp_number AS customer_phone,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE o.business_id = :business_id
    """
    params: dict = {"business_id": business_id}

    if status:
        query += " AND o.status = :status"
        params["status"] = status

    if search:
        query += " AND (c.name ILIKE :search OR c.whatsapp_number ILIKE :search)"
        params["search"] = f"%{search}%"

    query += " ORDER BY o.created_at DESC"

    rows = db.execute(text(query), params).fetchall()
    return [dict(row._mapping) for row in rows]

def count_by_status(db: Session, business_id: str) -> dict[str, int]:
    rows = db.execute(
        text("SELECT status, COUNT(*) FROM orders WHERE business_id = :business_id GROUP BY status"),
        {"business_id": business_id},
    ).fetchall()
    return {row[0]: row[1] for row in rows}

def get_order(db: Session, business_id: str, order_id: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT o.*, c.name AS customer_name, c.whatsapp_number AS customer_phone
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            WHERE o.id = :order_id AND o.business_id = :business_id
        """),
        {"order_id": order_id, "business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None

def get_order_items(db: Session, order_id: str) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT oi.id, oi.quantity, oi.unit_price, p.name AS product_name
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = :order_id
        """),
        {"order_id": order_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]

def update_order_status(db: Session, business_id: str, order_id: str, status: str) -> dict | None:
    row = db.execute(
        text("""
            UPDATE orders
            SET status = :status, updated_at = NOW()
            WHERE id = :order_id AND business_id = :business_id
            RETURNING *
        """),
        {"status": status, "order_id": order_id, "business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None

def create_order(
        db: Session,
        business_id: str,
        customer_id: str,
        items: list[dict],  # [{"product_id": ..., "quantity": ...}, ...]
        delivery_address: str,
        payment_method: str = "cod",
        created_by: str = "ai",
    ) -> dict:
        subtotal = 0.0
        resolved_items = []
 
        for item in items:
            product = db.execute(
                text(
                    "SELECT id, name, price, stock FROM products "
                    "WHERE id = :product_id AND business_id = :business_id"
                ),
                {"product_id": item["product_id"], "business_id": business_id},
            ).fetchone()
            if not product:
                raise ValueError(f"Product {item['product_id']} not found")
            if product.stock < item["quantity"]:
                raise ValueError(f"Not enough stock for {product.name}")
 
            unit_price = float(product.price)
            subtotal += unit_price * item["quantity"]
            resolved_items.append(
                {"product_id": str(product.id), "quantity": item["quantity"], "unit_price": unit_price}
            )
 
        business = db.execute(
            text("SELECT delivery_charge, tax_rate FROM businesses WHERE id = :business_id"),
            {"business_id": business_id},
        ).fetchone()
        delivery_charge = float(business.delivery_charge)
        tax = round(subtotal * float(business.tax_rate) / 100, 2)
        total = round(subtotal + delivery_charge + tax, 2)
 
        row = db.execute(
            text(
                """
                INSERT INTO orders
                    (business_id, customer_id, status, payment_method,
                     subtotal, delivery_charge, tax, total, delivery_address, created_by)
                VALUES
                    (:business_id, :customer_id, 'new', :payment_method,
                     :subtotal, :delivery_charge, :tax, :total, :delivery_address, :created_by)
                RETURNING *
                """
            ),
            {
                "business_id": business_id,
                "customer_id": customer_id,
                "payment_method": payment_method,
                "subtotal": subtotal,
                "delivery_charge": delivery_charge,
                "tax": tax,
                "total": total,
                "delivery_address": delivery_address,
                "created_by": created_by,
            },
        ).fetchone()
        order_id = row.id
 
        for item in resolved_items:
            db.execute(
                text(
                    "INSERT INTO order_items (order_id, product_id, quantity, unit_price) "
                    "VALUES (:order_id, :product_id, :quantity, :unit_price)"
                ),
                {"order_id": order_id, **item},
            )
 
        db.commit()
        return dict(row._mapping)