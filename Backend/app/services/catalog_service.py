from app.repositories import product_repository
from app.core.logger import get_logger

class ProductError(Exception):

    def __init__(self, message: str, stat)
