"""Application entry point that works from any current directory."""

from pathlib import Path
import os

from fastapi.staticfiles import StaticFiles


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

# api_server_v3 currently locates its model files relative to the process
# directory. Set it before importing the application so existing model loading
# remains reliable when launched from the project root or this directory.
os.chdir(BACKEND_DIR)

from backend.api_server_v3 import app  # noqa: E402


@app.middleware("http")
async def prevent_stale_map_assets(request, call_next):
    """Always refresh the app shell and runtime map integration after updates."""
    response = await call_next(request)
    if request.url.path in {"/", "/maps-loader.js"}:
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


# Replace the API-only root response with the prebuilt web client. API routes
# remain registered before this mount and therefore continue to take priority.
app.router.routes = [
    route for route in app.router.routes if getattr(route, "path", None) != "/"
]
frontend_dir = PROJECT_DIR / "frontend" / "dist"
if frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
