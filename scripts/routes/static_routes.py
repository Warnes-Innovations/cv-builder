"""Static file serving routes: index, favicon, web assets, logo."""
from pathlib import Path

from flask import Blueprint, redirect, send_file, send_from_directory, url_for


def create_blueprint(deps):
    bp = Blueprint('static_routes', __name__)

    preload_session_id = deps['preload_session_id']

    @bp.get("/")
    def index():
        _pid = preload_session_id()
        if _pid and not __import__('flask').request.args.get("session"):
            return redirect(url_for("static_routes.index", session=_pid))
        page_path = Path(__file__).parent.parent.parent / "web" / "index.html"
        return send_file(page_path)

    @bp.get("/favicon.ico")
    def favicon():
        return "", 204

    @bp.get("/<path:filename>")
    def static_web(filename):
        web_dir = Path(__file__).parent.parent.parent / "web"
        return send_from_directory(web_dir, filename)

    @bp.get("/logo")
    def logo():
        logo_path = Path(__file__).parent.parent.parent / "web" / "media" / "logo_white_transparent.png"
        if logo_path.exists():
            return send_file(logo_path)
        else:
            return "", 404

    return bp
