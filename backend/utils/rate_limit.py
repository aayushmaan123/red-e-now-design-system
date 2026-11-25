"""Per-IP rate limiting for the public auth endpoints.

Storage is in-memory. On a serverless host each warm instance keeps its own
counters, so the limit is approximate there; that is acceptable for slowing
down password guessing on a demo, and needs a shared store (Redis) before a
real launch.
"""

import os

from flask import request
from flask_limiter import Limiter


# Overridable per environment, e.g. RATE_LIMIT_LOGIN="5 per minute".
LOGIN_LIMIT = os.getenv("RATE_LIMIT_LOGIN", "20 per minute;200 per hour")
REGISTER_LIMIT = os.getenv("RATE_LIMIT_REGISTER", "5 per minute;30 per hour")


def client_ip():
    # Vercel terminates the connection and overwrites X-Forwarded-For with
    # the real client address, so it can be trusted there. Anywhere else a
    # client could forge the header to dodge the limit, so use the socket.
    if os.getenv("VERCEL"):
        forwarded = request.headers.get("X-Forwarded-For", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first

    return request.remote_addr or "unknown"


limiter = Limiter(
    key_func=client_ip,
    storage_uri="memory://",
    default_limits=[],
    headers_enabled=True,
)
