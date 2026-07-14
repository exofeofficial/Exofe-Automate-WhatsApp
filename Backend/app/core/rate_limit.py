# core/rate_limit.py
# Used to stop spam on the public endpoints (waitlist, demo booking) since
# anyone can hit these without logging in.
#
# Right now the counts are just kept in memory, fine for one server. If we
# ever run more than one server instance, this needs to move to Redis so
# they all share the same count:
#   Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
