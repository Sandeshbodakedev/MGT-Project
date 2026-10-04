import sys
import os

# Add project root to sys.path so 'backend' package is resolvable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from starlette.routing import Route

# Ensure all routes are accessible both with and without /api prefix on Vercel
existing_paths = {r.path for r in app.routes if isinstance(r, Route)}
for r in list(app.routes):
    if isinstance(r, Route) and r.path.startswith("/api/"):
        stripped = r.path[4:]
        if stripped not in existing_paths:
            app.add_api_route(stripped, r.endpoint, methods=r.methods)
            existing_paths.add(stripped)
