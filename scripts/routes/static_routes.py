# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Static file routes — index, favicon, web assets, logo.
"""
from pathlib import Path

from flask import Blueprint, redirect, send_file, send_from_directory, url_for

# CURRENTLY INACTIVE: this blueprint module is not registered by the current
# `scripts.web_app.create_app()`. Keep it as part of the route-modularization
# path unless the architecture is explicitly reverted.


def create_blueprint(deps):
    bp = Blueprint('static', __name__)

    _preload_session_id = deps.get('preload_session_id')

    @bp.get("/")
    def index():
        if _preload_session_id and not __import__('flask').request.args.get("session"):
            return redirect(url_for("static.index", session=_preload_session_id))
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
        return "", 404

    return bp
