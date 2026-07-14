# /api/v1/whatsapp.py
# Endpoints: /whatsapp/connect, /whatsapp/status, /whatsapp/disconnect, /whatsapp/messages

from fastapi import APIRouter

router = APIRouter(prefix='/whatsapp', tags=['whatsapp'])