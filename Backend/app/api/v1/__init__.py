from fastapi import APIRouter
from app.api.v1 import (
    whatsapp,
    integrations,
    shopify,
    templates,
    notifications,
    ai,
    admin,
    auth,
    billing,
    customers,
    dashboard,
    developers,
    marketing,
    orders,
    products,
    public,
    settings,
    team,
    automation
)
router = APIRouter()

router.include_router(whatsapp.router)
router.include_router(integrations.router)
router.include_router(shopify.router)
router.include_router(templates.router)
router.include_router(notifications.router)
router.include_router(ai.router)
router.include_router(admin.router)
router.include_router(auth.router)
router.include_router(automation.router)
router.include_router(billing.router)
router.include_router(customers.router)
router.include_router(dashboard.router)
router.include_router(developers.router)
router.include_router(marketing.router)
router.include_router(orders.router)
router.include_router(products.router)
router.include_router(products.categories_router)
router.include_router(public.router)
router.include_router(settings.router)
router.include_router(team.router)