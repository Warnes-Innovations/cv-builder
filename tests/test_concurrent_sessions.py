import argparse
import json
import sys
import tempfile
import threading
from contextlib import ExitStack
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from scripts.utils.conversation_manager import Phase  # noqa: E402
from scripts.web_app import create_app  # noqa: E402


SAMPLE_MASTER_DATA = {
    "personal_info": {
        "name": "Jane Example",
        "languages": [{"language": "English", "proficiency": "Native"}],
    },
    "experience": [
        {
            "id": "exp_001",
            "title": "Staff Data Scientist",
            "company": "Example Co",
            "achievements": [{"text": "Built forcasting systems."}],
        }
    ],
    "skills": [{"name": "Python", "category": "Programming"}],
    "selected_achievements": [
        {"id": "sa_001", "text": "Built a forcasting platform"}
    ],
    "education": [{"degree": "Doctroate", "institution": "Example University"}],
    "awards": [{"title": "Top Perfomer"}],
    "certifications": [{"name": "Machien Learning Cert", "issuer": "Example Org"}],
    "professional_summaries": {"default": "Experienced analytics leader."},
    "publications": [
        {
            "title": "Forcasting in Practice",
            "authors": "Jane Example",
            "journal": "Data Science Journal",
            "year": "2024",
        }
    ],
}


class FakeOrchestrator:
    def __init__(
        self,
        master_data_path: str,
        publications_path: str,
        output_dir: str,
        llm_client: Any,
    ) -> None:
        self.master_data_path = master_data_path
        self.publications_path = publications_path
        self.output_dir = output_dir
        self.llm_client = llm_client
        self.master_data = dict(SAMPLE_MASTER_DATA)

    def propose_rewrites(
        self,
        _content: dict[str, Any],
        _job_analysis: dict[str, Any],
        conversation_history: list[dict[str, Any]] | None = None,
        user_preferences: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return [
            {
                "id": "rewrite-1",
                "section": "summary",
                "original": "Original summary bullet",
                "proposed": "Sharper summary bullet",
                "reason": "Align to ATS keywords",
                "conversation_history": conversation_history or [],
                "user_preferences": user_preferences or {},
            }
        ]

    def build_render_ready_content(
        self,
        _job_analysis: dict[str, Any],
        _customizations: dict[str, Any],
        approved_rewrites: list[dict[str, Any]] | None = None,
        spell_audit: list[dict[str, Any]] | None = None,
        max_skills: int | None = None,
        use_semantic_match: bool = True,
    ) -> dict[str, Any]:
        del approved_rewrites, spell_audit, max_skills, use_semantic_match
        return {
            "personal_info": dict(self.master_data.get("personal_info", {})),
            "summary": self.master_data.get("professional_summaries", {}).get("default", ""),
            "experiences": list(self.master_data.get("experience", [])),
            "achievements": list(self.master_data.get("selected_achievements", [])),
            "skills": list(self.master_data.get("skills", [])),
            "education": list(self.master_data.get("education", [])),
            "certifications": list(self.master_data.get("certifications", [])),
            "publications": list(self.master_data.get("publications", [])),
            "awards": list(self.master_data.get("awards", [])),
        }

    def _prepare_cv_data_for_template(
        self,
        selected_content: dict[str, Any],
        job_analysis: dict[str, Any],
        template_variant: str = "standard",
    ) -> dict[str, Any]:
        del template_variant
        return {
            "professional_summary": selected_content.get("summary", ""),
            "experiences": selected_content.get("experiences", []),
            "education": selected_content.get("education", []),
            "skills_by_category": [{"category": "Programming", "skills": selected_content.get("skills", [])}],
            "awards": selected_content.get("awards", []),
            "certifications": selected_content.get("certifications", []),
            "publications": selected_content.get("publications", []),
            "template_metadata": {
                "job_title": job_analysis.get("title", ""),
                "company": job_analysis.get("company", ""),
            },
        }


class FakeConversationManager:
    def __init__(
        self,
        orchestrator: FakeOrchestrator,
        llm_client: Any,
        *,
        job_barrier: threading.Barrier | None = None,
    ) -> None:
        self.orchestrator = orchestrator
        self.llm_client = llm_client
        self.job_barrier = job_barrier
        self.session_id: str | None = None
        self.session_dir = Path(orchestrator.output_dir)
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.session_file = self.session_dir / "session.json"
        self.conversation_history: list[dict[str, Any]] = []
        self.state = {
            "phase": Phase.INIT,
            "position_name": None,
            "job_description": None,
            "job_analysis": None,
            "post_analysis_questions": [],
            "post_analysis_answers": {},
            "customizations": None,
            "generated_files": None,
            "generation_progress": [],
            "persuasion_warnings": [],
            "iterating": False,
            "reentry_phase": None,
            "experience_decisions": {},
            "skill_decisions": {},
            "achievement_decisions": {},
            "publication_decisions": {},
            "summary_focus_override": None,
            "extra_skills": [],
        }
        self.save_calls = 0
        self.processed_messages: list[str] = []
        self.executed_actions: list[dict[str, Any]] = []
        self.rewrite_decisions: list[dict[str, Any]] = []
        self.spell_audits: list[dict[str, Any]] = []
        self.layout_instruction_batches: list[dict[str, Any]] = []
        self.back_to_phase_calls: list[str] = []
        self.re_run_phase_calls: list[str] = []

    def add_job_description(self, job_text: str) -> None:
        if self.job_barrier is not None:
            self.job_barrier.wait(timeout=2)
        self.state["job_description"] = job_text

    def normalize_skills_data(self, skills_data: Any) -> list[dict[str, Any]]:
        if isinstance(skills_data, list):
            return list(skills_data)
        if not isinstance(skills_data, dict):
            return []
        normalized = []
        for category, entries in skills_data.items():
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if isinstance(entry, dict):
                    normalized.append(entry)
                    continue
                normalized.append({"name": str(entry), "category": category})
        return normalized

    def _save_session(self) -> None:
        self.save_calls += 1

    def save_session(self) -> None:
        self._save_session()

    def _process_message(self, message: str) -> dict[str, Any]:
        self.processed_messages.append(message)
        self.conversation_history.append({"role": "user", "content": message})
        return {"reply": f"processed:{message}"}

    def _execute_action(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        self.executed_actions.append(dict(payload))
        action = payload.get("action")
        if action == "unsupported_action":
            return None
        return {
            "handled_action": action,
            "job_text": payload.get("job_text"),
            "user_preferences": payload.get("user_preferences"),
        }

    def submit_rewrite_decisions(
        self,
        decisions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        self.rewrite_decisions = list(decisions)
        self.state["phase"] = Phase.SPELL_CHECK
        self._save_session()
        rejected_count = sum(
            1
            for decision in decisions
            if decision.get("outcome") == "reject"
        )
        return {
            "approved_count": len(decisions) - rejected_count,
            "rejected_count": rejected_count,
            "phase": "spell_check",
        }

    def complete_spell_check(
        self,
        spell_audit: list[dict[str, Any]],
    ) -> dict[str, Any]:
        self.spell_audits = list(spell_audit)
        self.state["phase"] = Phase.GENERATION
        self._save_session()
        accepted_count = sum(
            1
            for audit_entry in spell_audit
            if audit_entry.get("outcome") == "accept"
        )
        return {
            "flag_count": len(spell_audit),
            "accepted_count": accepted_count,
            "phase": "generation",
        }

    def complete_layout_review(
        self,
        layout_instructions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        self.layout_instruction_batches = list(layout_instructions)
        self.state["phase"] = Phase.REFINEMENT
        self._save_session()
        return {
            "instructions_applied": len(layout_instructions),
            "phase": "refinement",
        }

    def back_to_phase(self, target: str) -> dict[str, Any]:
        self.back_to_phase_calls.append(target)
        self.state["phase"] = target
        return {"ok": True, "phase": target}

    def re_run_phase(self, target: str) -> dict[str, Any]:
        self.re_run_phase_calls.append(target)
        self.state["phase"] = target
        return {
            "ok": True,
            "phase": target,
            "prior_output": f"prior:{target}",
            "new_output": f"new:{target}",
        }

    def run_persuasion_checks(
        self,
        rewrites: list[dict[str, Any]],
        _job_analysis: dict[str, Any],
        _master_data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        return (
            [{"rewrite_id": rewrites[0]["id"], "severity": "info"}]
            if rewrites
            else []
        )

    def log_achievement_rewrite(
        self,
        original_text: str,
        experience_context: str,
        user_instructions: str,
        previous_suggestions: list,
        suggested_text: str,
    ) -> str:
        import uuid
        return uuid.uuid4().hex[:12]

    def update_achievement_rewrite_outcome(
        self,
        log_id: str,
        outcome: str,
        accepted_text: str | None = None,
    ) -> bool:
        return True


@pytest.fixture(name="build_app")
def build_app_fixture():
    resources: list[tuple[ExitStack, tempfile.TemporaryDirectory[str]]] = []

    def _build(*, job_barrier: threading.Barrier | None = None):
        temp_dir = tempfile.TemporaryDirectory()
        temp_path = Path(temp_dir.name)
        master_path = temp_path / "Master_CV_Data.json"
        master_path.write_text(
            json.dumps(SAMPLE_MASTER_DATA),
            encoding="utf-8",
        )
        publications_path = temp_path / "publications.bib"
        publications_path.touch()

        args = argparse.Namespace(
            llm_provider="local",
            model=None,
            master_data=str(master_path),
            publications=str(publications_path),
            output_dir=str(temp_path / "output"),
            job_file=None,
        )

        tracker: dict[str, list[Any]] = {"managers": [], "orchestrators": []}
        stack = ExitStack()
        resources.append((stack, temp_dir))

        mock_llm = MagicMock()
        mock_llm.chat.return_value = "Generated text"
        mock_llm.generate_professional_summary.return_value = (
            "Generated summary"
        )
        mock_llm.rewrite_achievement.return_value = "Rewritten achievement"
        mock_llm.model = "local-model"

        stack.enter_context(
            patch("scripts.web_app.get_llm_provider", return_value=mock_llm)
        )
        stack.enter_context(
            patch("scripts.web_app.get_cached_pricing", return_value={})
        )
        stack.enter_context(
            patch(
                "scripts.web_app.get_pricing_updated_at",
                return_value="2026-03-18",
            )
        )
        stack.enter_context(
            patch("scripts.web_app.get_pricing_source", return_value="static")
        )

        def _build_orchestrator(*args: Any, **kwargs: Any) -> FakeOrchestrator:
            orchestrator = FakeOrchestrator(*args, **kwargs)
            tracker["orchestrators"].append(orchestrator)
            return orchestrator

        def _build_manager(
            *args: Any,
            **kwargs: Any,
        ) -> FakeConversationManager:
            manager = FakeConversationManager(
                *args,
                **kwargs,
                job_barrier=job_barrier,
            )
            tracker["managers"].append(manager)
            return manager

        stack.enter_context(
            patch(
                "scripts.web_app.CVOrchestrator",
                side_effect=_build_orchestrator,
            )
        )
        stack.enter_context(
            patch(
                "scripts.web_app.ConversationManager",
                side_effect=_build_manager,
            )
        )

        app = create_app(args)
        app.config["TESTING"] = True
        return app, tracker

    yield _build

    for stack, temp_dir in reversed(resources):
        stack.close()
        temp_dir.cleanup()


def _new_session(client) -> str:
    response = client.post("/api/sessions/new")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    return payload["session_id"]


def _claim_session(client, session_id: str, owner_token: str):
    return client.post(
        "/api/sessions/claim",
        json={"session_id": session_id, "owner_token": owner_token},
    )


def _active_sessions_by_id(
    client,
    owner_token: str | None = None,
) -> dict[str, dict[str, Any]]:
    query_string = {}
    if owner_token is not None:
        query_string["owner_token"] = owner_token
    response = client.get("/api/sessions/active", query_string=query_string)
    assert response.status_code == 200
    payload = response.get_json()
    return {session["session_id"]: session for session in payload["sessions"]}


def _manager_for_session(
    tracker: dict[str, list[Any]],
    session_id: str,
) -> FakeConversationManager:
    for manager in tracker["managers"]:
        if manager.session_id == session_id:
            return manager
    raise AssertionError(f"No manager found for session {session_id}")


def _orchestrator_for_session(
    tracker: dict[str, list[Any]],
    session_id: str,
) -> FakeOrchestrator:
    manager = _manager_for_session(tracker, session_id)
    for orchestrator in tracker["orchestrators"]:
        if orchestrator.output_dir == str(manager.session_dir):
            return orchestrator
    raise AssertionError(f"No orchestrator found for session {session_id}")


def test_claim_and_takeover_routes_update_session_ownership(build_app):
    app, _tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)

        missing = client.post(
            "/api/sessions/claim",
            json={"session_id": session_id},
        )
        assert missing.status_code == 400
        assert (
            missing.get_json()["error"]
            == "session_id and owner_token required"
        )

        claimed = _claim_session(client, session_id, "owner-a")
        assert claimed.status_code == 200
        assert claimed.get_json()["ok"] is True

        conflict = _claim_session(client, session_id, "owner-b")
        assert conflict.status_code == 409
        assert conflict.get_json()["error"] == "session_owned"

        takeover = client.post(
            "/api/sessions/takeover",
            json={"session_id": session_id, "owner_token": "owner-b"},
        )
        assert takeover.status_code == 200
        assert takeover.get_json()["ok"] is True

        sessions = _active_sessions_by_id(client, owner_token="owner-b")
        assert sessions[session_id]["claimed"] is True
        assert sessions[session_id]["owned_by_requester"] is True


def test_session_aware_routes_enforce_session_and_owner_tokens(build_app):
    app, _tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        missing_session = client.post(
            "/api/job",
            json={"job_text": "Missing session"},
        )
        assert missing_session.status_code == 400

        unknown_session = client.post(
            "/api/job",
            json={
                "session_id": "deadbeef",
                "owner_token": "owner-a",
                "job_text": "Unknown session",
            },
        )
        assert unknown_session.status_code == 404

        wrong_owner_job = client.post(
            "/api/job",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "job_text": (
                    "Staff Data Scientist\n"
                    "Example Co\n"
                    "Build ML systems."
                ),
            },
        )
        assert wrong_owner_job.status_code == 403

        wrong_owner_reset = client.post(
            "/api/reset",
            json={"session_id": session_id, "owner_token": "owner-b"},
        )
        assert wrong_owner_reset.status_code == 403

        success = client.post(
            "/api/job",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "job_text": (
                    "Staff Data Scientist\n"
                    "Example Co\n"
                    "Build ML systems."
                ),
            },
        )
        assert success.status_code == 200
        assert success.get_json()["ok"] is True

        status = client.get(
            "/api/status",
            query_string={"session_id": session_id},
        )
        assert status.status_code == 200
        status_payload = status.get_json()
        assert status_payload["job_description_text"] == (
            "Staff Data Scientist\n"
            "Example Co\n"
            "Build ML systems."
        )
        assert (
            status_payload["position_name"]
            == "Staff Data Scientist at Example Co"
        )

        reset = client.post(
            "/api/reset",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert reset.status_code == 200
        assert reset.get_json()["ok"] is True

        reset_status = client.get(
            "/api/status",
            query_string={"session_id": session_id},
        )
        assert reset_status.status_code == 200
        reset_payload = reset_status.get_json()
        assert reset_payload["job_description_text"] is None
        assert reset_payload["position_name"] is None
        assert reset_payload["phase"] == Phase.INIT


def test_sessions_active_reports_per_session_metadata(build_app):
    app, _tracker = build_app()

    with app.test_client() as client:
        first_session = _new_session(client)
        second_session = _new_session(client)

        _claim_session(client, first_session, "owner-a")
        _claim_session(client, second_session, "owner-b")

        job_response = client.post(
            "/api/job",
            json={
                "session_id": first_session,
                "owner_token": "owner-a",
                "job_text": (
                    "Principal Engineer\n"
                    "Acme Labs\n"
                    "Lead platform modernization."
                ),
            },
        )
        assert job_response.status_code == 200

        sessions = _active_sessions_by_id(client, owner_token="owner-a")
        assert set(sessions) == {first_session, second_session}
        assert "owner_token" not in sessions[first_session]
        assert sessions[first_session]["claimed"] is True
        assert sessions[first_session]["owned_by_requester"] is True
        assert (
            sessions[first_session]["position_name"]
            == "Principal Engineer at Acme Labs"
        )
        assert sessions[first_session]["phase"] == Phase.INIT
        assert sessions[second_session]["claimed"] is True
        assert sessions[second_session]["owned_by_requester"] is False
        assert sessions[second_session]["position_name"] is None
        assert sessions[second_session]["phase"] == Phase.INIT


def test_session_evict_route_enforces_ownership(build_app):
    app, _tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        wrong_owner = client.delete(
            f"/api/sessions/{session_id}/evict",
            json={"owner_token": "owner-b"},
        )
        assert wrong_owner.status_code == 403

        ok = client.delete(
            f"/api/sessions/{session_id}/evict",
            json={"owner_token": "owner-a"},
        )
        assert ok.status_code == 200
        assert ok.get_json()["ok"] is True

        missing = client.get(
            "/api/status",
            query_string={"session_id": session_id},
        )
        assert missing.status_code == 404


def test_message_route_enforces_ownership_and_mutates_session(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        missing_session = client.post(
            "/api/message",
            json={"message": "hello"},
        )
        assert missing_session.status_code == 400

        wrong_owner = client.post(
            "/api/message",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "message": "hello",
            },
        )
        assert wrong_owner.status_code == 403

        missing_message = client.post(
            "/api/message",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_message.status_code == 400
        assert missing_message.get_json()["error"] == "Missing message"

        before_sessions = _active_sessions_by_id(client)

        success = client.post(
            "/api/message",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "message": "hello session",
            },
        )
        assert success.status_code == 200
        payload = success.get_json()
        assert payload["ok"] is True
        assert payload["response"] == {"reply": "processed:hello session"}
        assert payload["phase"] == Phase.INIT

        manager = _manager_for_session(tracker, session_id)
        assert manager.processed_messages == ["hello session"]

        after_sessions = _active_sessions_by_id(client)
        assert (
            after_sessions[session_id]["last_modified"]
            != before_sessions[session_id]["last_modified"]
        )


def test_action_route_enforces_ownership_and_forwards_payload(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        missing_session = client.post(
            "/api/action",
            json={"action": "analyze_job"},
        )
        assert missing_session.status_code == 400

        wrong_owner = client.post(
            "/api/action",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "action": "analyze_job",
            },
        )
        assert wrong_owner.status_code == 403

        missing_action = client.post(
            "/api/action",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_action.status_code == 400
        assert missing_action.get_json()["error"] == "Missing action"

        unsupported = client.post(
            "/api/action",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "action": "unsupported_action",
            },
        )
        assert unsupported.status_code == 400
        assert (
            unsupported.get_json()["error"]
            == "Invalid or unsupported action"
        )

        success = client.post(
            "/api/action",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "action": "analyze_job",
                "job_text": "Role details",
                "user_preferences": {"tone": "concise"},
                "ignored": "should not pass through",
            },
        )
        assert success.status_code == 200
        payload = success.get_json()
        assert payload["ok"] is True
        assert payload["result"] == {
            "handled_action": "analyze_job",
            "job_text": "Role details",
            "user_preferences": {"tone": "concise"},
        }
        assert payload["phase"] == Phase.INIT

        manager = _manager_for_session(tracker, session_id)
        assert manager.executed_actions[-1] == {
            "action": "analyze_job",
            "job_text": "Role details",
            "user_preferences": {"tone": "concise"},
        }


def test_rewrite_approval_route_updates_phase_and_enforces_ownership(
    build_app,
):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        missing_session = client.post(
            "/api/rewrites/approve",
            json={"decisions": []},
        )
        assert missing_session.status_code == 400

        wrong_owner = client.post(
            "/api/rewrites/approve",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "decisions": [],
            },
        )
        assert wrong_owner.status_code == 403

        missing_decisions = client.post(
            "/api/rewrites/approve",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_decisions.status_code == 400
        assert missing_decisions.get_json()["error"] == "Missing decisions"

        invalid_decisions = client.post(
            "/api/rewrites/approve",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "decisions": {"id": "rewrite-1"},
            },
        )
        assert invalid_decisions.status_code == 400
        assert (
            invalid_decisions.get_json()["error"]
            == "decisions must be a list"
        )

        decisions = [
            {"id": "rewrite-1", "outcome": "accept", "final_text": None},
            {"id": "rewrite-2", "outcome": "reject", "final_text": None},
            {
                "id": "rewrite-3",
                "outcome": "edit",
                "final_text": "Edited bullet",
            },
        ]
        success = client.post(
            "/api/rewrites/approve",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "decisions": decisions,
            },
        )
        assert success.status_code == 200
        payload = success.get_json()
        assert payload == {
            "ok": True,
            "approved_count": 2,
            "rejected_count": 1,
            "phase": "spell_check",
        }

        manager = _manager_for_session(tracker, session_id)
        assert manager.rewrite_decisions == decisions
        assert manager.state["phase"] == Phase.SPELL_CHECK


def test_spell_check_completion_route_updates_phase_and_audit(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        wrong_owner = client.post(
            "/api/spell-check-complete",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "spell_audit": [],
            },
        )
        assert wrong_owner.status_code == 403

        spell_audit = [
            {
                "context_type": "bullet",
                "location": "experience:0",
                "original": "teh",
                "suggestion": "the",
                "rule": "typo",
                "outcome": "accept",
                "final": "the",
            },
            {
                "context_type": "summary",
                "location": "summary:0",
                "original": "colour",
                "suggestion": "color",
                "rule": "style",
                "outcome": "reject",
                "final": "colour",
            },
        ]
        success = client.post(
            "/api/spell-check-complete",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "spell_audit": spell_audit,
            },
        )
        assert success.status_code == 200
        payload = success.get_json()
        assert payload == {
            "ok": True,
            "flag_count": 2,
            "accepted_count": 1,
            "phase": "generation",
        }

        manager = _manager_for_session(tracker, session_id)
        assert manager.spell_audits == spell_audit
        assert manager.state["phase"] == Phase.GENERATION


def test_spell_check_sections_route_covers_rendered_resume_content(build_app):
    app, _tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        response = client.get(
            "/api/spell-check-sections",
            query_string={"session_id": session_id},
        )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True

    section_ids = {section["id"] for section in payload["sections"]}
    assert "summary" in section_ids
    assert "selected_ach_0" in section_ids
    assert "skill_0" in section_ids
    assert "edu_0_degree" in section_ids
    assert "award_0_title" in section_ids
    assert "cert_0_name" in section_ids
    assert "lang_0_language" in section_ids
    assert "pub_0_title" in section_ids
    assert "exp_exp_001_ach_0" in section_ids

    stats = payload["aggregate_stats"]
    assert stats["word_count"] > 0
    assert stats["unique_words"] > 0


def test_spell_check_sections_route_skips_semantic_match_scoring(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        orchestrator = _orchestrator_for_session(tracker, session_id)
        if orchestrator.llm_client is not None:
            orchestrator.llm_client.semantic_match.side_effect = AssertionError(
                "spell-check sections should not call semantic_match"
            )

        response = client.get(
            "/api/spell-check-sections",
            query_string={"session_id": session_id},
        )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True


def test_layout_completion_route_updates_phase_and_tracks_instructions(
    build_app,
):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        wrong_owner = client.post(
            "/api/layout-complete",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "layout_instructions": [],
            },
        )
        assert wrong_owner.status_code == 403

        instructions = [
            {
                "timestamp": "2026-03-18T19:30:00",
                "instruction_text": "Tighten the summary spacing",
                "change_summary": "Reduced top margin on summary block",
                "confirmation": "accepted",
            },
            {
                "timestamp": "2026-03-18T19:31:00",
                "instruction_text": "Balance page one whitespace",
                "change_summary": "Pulled publications to page two",
                "confirmation": "accepted",
            },
        ]
        success = client.post(
            "/api/layout-complete",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "layout_instructions": instructions,
            },
        )
        assert success.status_code == 200
        payload = success.get_json()
        assert payload == {
            "ok": True,
            "instructions_applied": 2,
            "phase": "refinement",
        }

        manager = _manager_for_session(tracker, session_id)
        assert manager.layout_instruction_batches == instructions
        assert manager.state["phase"] == Phase.REFINEMENT


def test_summary_and_master_data_routes_enforce_ownership(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")

        no_analysis = client.post(
            "/api/generate-summary",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert no_analysis.status_code == 400
        assert "No job analysis found" in no_analysis.get_json()["error"]

        manager = _manager_for_session(tracker, session_id)
        manager.state["job_analysis"] = {"title": "Staff Data Scientist"}
        manager.state["experience_decisions"] = {"exp_001": "include"}

        wrong_owner = client.post(
            "/api/master-data/update-summary",
            json={
                "session_id": session_id,
                "owner_token": "owner-b",
                "key": "targeted",
                "text": "New summary",
            },
        )
        assert wrong_owner.status_code == 403

        generated = client.post(
            "/api/generate-summary",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert generated.status_code == 200
        assert generated.get_json() == {
            "ok": True,
            "summary": "Generated summary",
        }
        assert manager.state["summary_focus_override"] == "ai_generated"
        assert (
            manager.state["session_summaries"]["ai_generated"]
            == "Generated summary"
        )

        updated_summary = client.post(
            "/api/master-data/update-summary",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "key": "targeted",
                "text": "New summary",
            },
        )
        assert updated_summary.status_code == 200
        assert updated_summary.get_json() == {
            "ok": True,
            "action": "added",
            "key": "targeted",
        }

        updated_achievement = client.post(
            "/api/master-data/update-achievement",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "id": "ach-001",
                "title": "New impact item",
            },
        )
        assert updated_achievement.status_code == 200
        assert updated_achievement.get_json() == {
            "ok": True,
            "action": "added",
            "id": "ach-001",
        }

        master_path = Path(tracker["orchestrators"][0].master_data_path)
        master_data = json.loads(master_path.read_text(encoding="utf-8"))
        assert (
            master_data["professional_summaries"]["targeted"]
            == "New summary"
        )
        assert any(
            achievement.get("id") == "ach-001"
            for achievement in master_data["selected_achievements"]
        )


def test_cover_letter_and_screening_routes_enforce_ownership(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")
        manager = _manager_for_session(tracker, session_id)
        manager.state["job_analysis"] = {
            "company": "Example Co",
            "title": "Staff Data Scientist",
            "required_skills": ["Python"],
            "ats_keywords": ["data science"],
        }
        manager.state["generated_files"] = {
            "output_dir": str(manager.session_dir)
        }

        wrong_owner = client.post(
            "/api/cover-letter/generate",
            json={"session_id": session_id, "owner_token": "owner-b"},
        )
        assert wrong_owner.status_code == 403

        generated = client.post(
            "/api/cover-letter/generate",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert generated.status_code == 200
        assert generated.get_json()["ok"] is True
        assert "Generated text" in generated.get_json()["text"]

        missing_text = client.post(
            "/api/cover-letter/save",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_text.status_code == 400
        assert missing_text.get_json()["error"] == "text is required"

        saved = client.post(
            "/api/cover-letter/save",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "text": "Cover letter body",
            },
        )
        assert saved.status_code == 200
        assert saved.get_json()["ok"] is True
        assert saved.get_json()["filename"].endswith(".docx")

        screening_save = client.post(
            "/api/screening/save",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert screening_save.status_code == 400
        assert screening_save.get_json()["error"] == "No responses to save."


def test_phase_navigation_and_review_routes_update_session_state(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")
        manager = _manager_for_session(tracker, session_id)

        missing_phase = client.post(
            "/api/back-to-phase",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_phase.status_code == 400

        back = client.post(
            "/api/back-to-phase",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "phase": "analysis",
                "feedback": "Focus more on platform work",
            },
        )
        assert back.status_code == 200
        assert back.get_json() == {"ok": True, "phase": "analysis"}
        assert manager.back_to_phase_calls == ["analysis"]
        assert manager.conversation_history[-1]["content"] == (
            "[Refinement feedback for analysis]: Focus more on platform work"
        )

        rerun = client.post(
            "/api/re-run-phase",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "phase": "customizations",
            },
        )
        assert rerun.status_code == 200
        assert rerun.get_json() == {
            "ok": True,
            "phase": "customizations",
            "prior_output": "prior:customizations",
            "new_output": "new:customizations",
        }
        assert manager.re_run_phase_calls == ["customizations"]

        generation_settings = client.post(
            "/api/generation-settings",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "max_skills": 7,
            },
        )
        assert generation_settings.status_code == 200
        assert generation_settings.get_json() == {"ok": True, "max_skills": 7}
        assert manager.state["max_skills"] == 7

        responses = client.post(
            "/api/post-analysis-responses",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "questions": [{"type": "clarification", "question": "Q1?"}],
                "answers": {"focus": "platform leadership"},
            },
        )
        assert responses.status_code == 200
        assert responses.get_json() == {
            "ok": True,
            "questions_count": 1,
            "answers_count": 1,
        }

        review = client.post(
            "/api/review-decisions",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "type": "skills",
                "decisions": {"python": "include"},
                "extra_skills": ["FastAPI"],
            },
        )
        assert review.status_code == 200
        assert review.get_json()["success"] is True
        assert manager.state["skill_decisions"] == {"python": "include"}
        assert manager.state["extra_skills"] == ["FastAPI"]


def test_editing_and_rewrite_fetch_routes_enforce_ownership(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")
        manager = _manager_for_session(tracker, session_id)
        manager.state["job_analysis"] = {
            "title": "Staff Data Scientist",
            "company": "Example Co",
        }
        manager.state["post_analysis_answers"] = {"focus": "platform work"}

        missing_edits = client.post(
            "/api/save-achievement-edits",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "edits": {},
            },
        )
        assert missing_edits.status_code == 400
        assert missing_edits.get_json()["error"] == "No edits provided"

        saved_edits = client.post(
            "/api/save-achievement-edits",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "edits": {"0": ["Edited bullet", "Second bullet"]},
            },
        )
        assert saved_edits.status_code == 200
        assert saved_edits.get_json()["success"] is True
        assert manager.state["achievement_edits"] == {
            0: ["Edited bullet", "Second bullet"]
        }

        missing_text = client.post(
            "/api/rewrite-achievement",
            json={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert missing_text.status_code == 400
        assert (
            missing_text.get_json()["error"]
            == "achievement_text is required"
        )

        rewritten = client.post(
            "/api/rewrite-achievement",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "achievement_text": "Built a pipeline",
                "experience_index": 0,
            },
        )
        assert rewritten.status_code == 200
        body = rewritten.get_json()
        assert body["rewritten"] == "Rewritten achievement"
        assert "log_id" in body

        save_cv = client.post(
            "/api/cv-data",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "personal_info": {"name": "Jane Doe"},
                "skills": ["Python"],
            },
        )
        assert save_cv.status_code == 200
        assert save_cv.get_json()["success"] is True
        assert (
            manager.state["edited_cv_data"]["personal_info"]["name"]
            == "Jane Doe"
        )

        rewrites = client.get(
            "/api/rewrites",
            query_string={"session_id": session_id, "owner_token": "owner-a"},
        )
        assert rewrites.status_code == 200
        rewrites_payload = rewrites.get_json()
        assert rewrites_payload["ok"] is True
        assert rewrites_payload["phase"] == Phase.REWRITE_REVIEW
        assert manager.state["phase"] == Phase.REWRITE_REVIEW
        assert manager.state["pending_rewrites"][0]["id"] == "rewrite-1"


def test_finalise_and_harvest_routes_enforce_ownership(build_app):
    app, tracker = build_app()

    with app.test_client() as client:
        session_id = _new_session(client)
        _claim_session(client, session_id, "owner-a")
        manager = _manager_for_session(tracker, session_id)
        manager.state["generated_files"] = {
            "output_dir": str(manager.session_dir),
            "files": ["cv.pdf"],
        }
        manager.state["job_analysis"] = {
            "company": "Example Co",
            "title": "Staff Data Scientist",
            "ats_keywords": ["python"],
        }
        metadata_path = manager.session_dir / "metadata.json"
        metadata_path.write_text(
            json.dumps(
                {
                    "company": "Example Co",
                    "role": "Staff Data Scientist",
                }
            ),
            encoding="utf-8",
        )

        finalise_wrong_owner = client.post(
            "/api/finalise",
            json={"session_id": session_id, "owner_token": "owner-b"},
        )
        assert finalise_wrong_owner.status_code == 403

        finalise = client.post(
            "/api/finalise",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "status": "ready",
                "notes": "Prepared for submission",
            },
        )
        assert finalise.status_code == 200
        finalise_payload = finalise.get_json()
        assert finalise_payload["ok"] is True
        assert finalise_payload["summary"]["application_status"] == "ready"
        assert manager.state["phase"] == Phase.REFINEMENT

        harvest = client.post(
            "/api/harvest/apply",
            json={
                "session_id": session_id,
                "owner_token": "owner-a",
                "selected_ids": [],
            },
        )
        assert harvest.status_code == 200
        assert harvest.get_json() == {
            "ok": True,
            "written_count": 0,
            "diff_summary": [],
            "commit_hash": None,
        }


def test_concurrent_session_mutations_stay_isolated(build_app):
    app, tracker = build_app(job_barrier=threading.Barrier(2))

    with app.test_client() as client:
        first_session = _new_session(client)
        second_session = _new_session(client)
        _claim_session(client, first_session, "owner-a")
        _claim_session(client, second_session, "owner-b")

    assert len(tracker["managers"]) == 2

    responses: dict[str, tuple[int, dict[str, Any]]] = {}

    def _submit_job(session_id: str, owner_token: str, job_text: str) -> None:
        with app.test_client() as thread_client:
            response = thread_client.post(
                "/api/job",
                json={
                    "session_id": session_id,
                    "owner_token": owner_token,
                    "job_text": job_text,
                },
            )
            responses[session_id] = (response.status_code, response.get_json())

    first_thread = threading.Thread(
        target=_submit_job,
        args=(
            first_session,
            "owner-a",
            "Platform Architect\nNorthwind\nDesign shared services.",
        ),
    )
    second_thread = threading.Thread(
        target=_submit_job,
        args=(
            second_session,
            "owner-b",
            "Director of Data\nContoso\nLead analytics strategy.",
        ),
    )

    first_thread.start()
    second_thread.start()
    first_thread.join()
    second_thread.join()

    assert responses[first_session][0] == 200
    assert responses[second_session][0] == 200

    with app.test_client() as client:
        first_status = client.get(
            "/api/status",
            query_string={"session_id": first_session},
        )
        second_status = client.get(
            "/api/status",
            query_string={"session_id": second_session},
        )

    first_payload = first_status.get_json()
    second_payload = second_status.get_json()

    assert first_payload["job_description_text"] == (
        "Platform Architect\nNorthwind\nDesign shared services."
    )
    assert first_payload["position_name"] == "Platform Architect at Northwind"
    assert second_payload["job_description_text"] == (
        "Director of Data\nContoso\nLead analytics strategy."
    )
    assert second_payload["position_name"] == "Director of Data at Contoso"
