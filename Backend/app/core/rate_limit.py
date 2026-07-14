# core/rate_limit.py
# Shared limiter for public, unauthenticated endpoints (waitlist, demo
# booking) that need protection from spam and bot floods since anyone can
# call them without logging in.
#
# In-memory storage, counters live in this process only, that's fine for a
# single server. If this ever runs behind more than one instance, switch to
# a shared backend so every instance agrees on the count:
#   Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
