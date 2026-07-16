from sqlalchemy import text
from sqlalchemy.orm import Session

def get_active_draft(db, customer_id: str) -> dict | None:
    row = db.execute(text("SELECT * FROM draft_orders WHERE customer_id = :customer_id"), 
    {'customer_id': customer_id})
    return row.mappings().first()
    
def create_draft(db, business_id: str, customer_id: str, data: dict, missing_fields: list[str]) -> dict:
    row = db.execute(
        text("""INSERT INTO draft_orders (business_id, customer_id, data, missing_fields) 
        VALUES(:business_id, :customer_id, :data, :missing_fields)"""),
        {"business_id": business_id, "customer_id": customer_id, "data": data, "missing_fields": missing_fields}
    )
    db.commit()
    return row.mappings().first()

def update_draft(db, draft_id: str, data: dict, missing_fields: list[str]) -> dict:
    row = db.execute(
        text("""UPDATE draft_orders SET data = :data, missing_fields = :missing_fields 
        WHERE id = :draft_id"""),
        {"draft_id": draft_id, "data": data, "missing_fields": missing_fields}
    )
    db.commit()
    return row.mappings().first()
    
def mark_status(db, draft_id: str, status: str, order_id: str | None = None) -> dict:
    row = db.execute(
        text("""UPDATE draft_orders SET status = :status 
        WHERE id = :draft_id AND order_id = :order_id"""),
        {"draft_id": draft_id, "status": status, "order_id": order_id}
    )
    db.commit()
    return row.mappings().first()

def clear_active(db, customer_id: str) -> None:
    db.execute(
        text("DELETE FROM draft_orders WHERE customer_id = :customer_id"),
        {"customer_id": customer_id}
    )
    db.commit()

def get_draft_by_id(db, draft_id: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM draft_orders WHERE id = :draft_id"),
        {"draft_id": draft_id}
    )
    return row.mappings().first()
