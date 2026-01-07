#!/usr/bin/env python3
"""
Minimal Web UI for LLM-Driven CV Generator

Serves a single-page web app with endpoints to:
- Submit a job description
- Send chat messages to the assistant
- View current state
- Save session

Run:
    python scripts/web_app.py --llm-provider github

Then open http://localhost:5000
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, request, send_file

# Ensure scripts are importable
sys.path.insert(0, str(Path(__file__).parent))

from utils.llm_client import get_llm_provider
from utils.cv_orchestrator import CVOrchestrator
from utils.conversation_manager import ConversationManager


def create_app(args) -> Flask:
    app = Flask(__name__, static_folder=None)

    # Initialize dependencies
    llm_client = get_llm_provider(provider=args.llm_provider, model=args.model)
    orchestrator = CVOrchestrator(
        master_data_path=args.master_data,
        publications_path=args.publications,
        output_dir=args.output_dir,
        llm_client=llm_client,
    )
    conversation = ConversationManager(orchestrator=orchestrator, llm_client=llm_client)

    # Preload job description if provided
    if args.job_file:
        job_file_path = Path(args.job_file)
        if job_file_path.exists():
            job_text = job_file_path.read_text(encoding="utf-8")
            conversation.add_job_description(job_text)

    @app.get("/")
    def index():
        page_path = Path(__file__).parent.parent / "web" / "index.html"
        return send_file(page_path)

    @app.get("/api/status")
    def status():
        return jsonify({
            "position_name": conversation.state.get("position_name"),
            "phase": conversation.state.get("phase"),
            "job_description": bool(conversation.state.get("job_description")),
            "job_analysis": bool(conversation.state.get("job_analysis")),
            "customizations": bool(conversation.state.get("customizations")),
            "generated_files": conversation.state.get("generated_files"),
        })

    @app.post("/api/job")
    def submit_job():
        data = request.get_json(silent=True) or {}
        job_text: Optional[str] = data.get("job_text")
        if not job_text:
            return jsonify({"error": "Missing job_text"}), 400
        # Store job description in state and also add to conversation history
        conversation.add_job_description(job_text)
        conversation.conversation_history.append({
            "role": "user",
            "content": job_text,
        })
        return jsonify({"ok": True, "message": "Job description added."})

    @app.get("/api/positions")
    def positions():
        # Reuse ConversationManager helper to list positions
        try:
            names = conversation._list_positions()
            return jsonify({"positions": names})
        except Exception as e:
            return jsonify({"error": str(e), "positions": []}), 500

    @app.post("/api/position")
    def set_position():
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        open_latest = bool(data.get("open_latest"))
        if not name:
            return jsonify({"error": "Missing name"}), 400
        conversation.state["position_name"] = name
        loaded = False
        if open_latest:
            loaded = conversation._load_latest_session_for_position(name)
        return jsonify({"ok": True, "loaded": loaded, "position_name": name})

    @app.post("/api/message")
    def send_message():
        data = request.get_json(silent=True) or {}
        msg: Optional[str] = data.get("message")
        if not msg:
            return jsonify({"error": "Missing message"}), 400
        try:
            response = conversation._process_message(msg)
            return jsonify({
                "ok": True,
                "response": response,
                "phase": conversation.state.get("phase"),
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/reset")
    def reset():
        # Call the reset logic via the existing method (requires user confirmation in CLI).
        # For web, we reset directly.
        conversation.conversation_history = []
        conversation.state = {
            "phase": "init",
            "job_description": None,
            "job_analysis": None,
            "customizations": None,
            "generated_files": None,
        }
        return jsonify({"ok": True, "message": "Conversation reset."})

    @app.post("/api/save")
    def save():
        try:
            conversation._save_session()
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/action")
    def do_action():
        data = request.get_json(silent=True) or {}
        action = data.get("action")
        if not action:
            return jsonify({"error": "Missing action"}), 400
        # Some actions can optionally include job_text
        payload = {"action": action}
        if data.get("job_text"):
            payload["job_text"] = data["job_text"]
        try:
            result = conversation._execute_action(payload)
            if not result:
                return jsonify({"error": "Invalid or unsupported action"}), 400
            return jsonify({
                "ok": True,
                "result": result,
                "phase": conversation.state.get("phase"),
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/history")
    def history():
        # Return the conversation history for chat-style rendering
        return jsonify({
            "history": conversation.conversation_history,
            "phase": conversation.state.get("phase"),
        })

    return app


def parse_args():
    parser = argparse.ArgumentParser(description="Minimal Web UI for CV Generator")
    parser.add_argument("--job-file", help="Path to job description text file")
    parser.add_argument("--master-data", default="Master_CV_Data.json")
    parser.add_argument("--publications", default="publications.bib")
    parser.add_argument("--output-dir", default="files")
    parser.add_argument("--llm-provider", choices=["github", "openai", "anthropic", "local"], default="github")
    parser.add_argument("--model", help="Specific model to use")
    parser.add_argument("--port", type=int, default=5000)
    return parser.parse_args()


def main():
    args = parse_args()
    app = create_app(args)
    app.run(host="127.0.0.1", port=args.port, debug=True)


if __name__ == "__main__":
    main()
