#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""cv-builder CLI.

A Click-based command-line interface that exposes the full cv-builder workflow.
Supports two execution modes for each LLM step:

**Normal mode** (requires ``--provider``)
    Calls the LLM internally and stores results automatically.

**Agent mode** (``--agent-mode``)
    Prints a PromptBundle JSON on stdout, then reads the LLM result from
    stdin.  Use this when the calling shell/agent is fulfilling the LLM call.

    Example pipe::

        cv-cli --agent-mode analyze | my-llm-wrapper | cv-cli --agent-mode analyze-submit

Usage examples::

    # Interactive / headless with provider
    cv-cli session new
    cv-cli job submit-text --session-id abc123 --text-file job.txt
    cv-cli --provider github analyze --session-id abc123
    cv-cli decisions submit --session-id abc123 --file decisions.json
    cv-cli generate --session-id abc123

    # Agent-as-LLM passthrough
    cv-cli --agent-mode analyze --session-id abc123 > bundle.json
    # ... agent processes bundle.json, writes result.json ...
    cv-cli analyze submit --session-id abc123 --result-file result.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, NoReturn, Optional

import click

# Ensure scripts/ directory is importable (handles both installed & dev invocations)
sys.path.insert(0, str(Path(__file__).parent))

from utils.agent_bridge import (
    InvalidResultError,
    OperationType,
    validate_agent_json,
)
from utils.headless_session import HeadlessSession


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

class CLIError(click.ClickException):
    """Raised on CLI user errors; rendered as a JSON error object on stderr."""

    exit_code = 1

    def show(self, file=None) -> None:  # type: ignore[override]
        click.echo(json.dumps({"ok": False, "error": self.format_message()}), err=True)


def _out(data: Any, pretty: bool = False) -> None:
    """Print *data* as JSON to stdout."""
    indent = 2 if pretty else None
    click.echo(json.dumps(data, indent=indent, default=str))


def _err(msg: str) -> NoReturn:
    raise CLIError(msg)


def _read_result(
    ctx_obj: Dict[str, Any],
    result_file: Optional[str],
    *,
    validate: bool = True,
) -> Any:
    """Read LLM result from file or stdin.

    In agent mode with no --result-file, reads from stdin.

    When *validate* is ``True`` (default) the raw text is parsed as JSON at
    the I/O boundary and the decoded object is returned.  Malformed JSON is
    reported immediately via :func:`_err` rather than propagating silently
    into session state downstream.
    """
    if result_file:
        raw = Path(result_file).expanduser().read_text(encoding="utf-8")
    elif ctx_obj.get("agent_mode"):
        raw = sys.stdin.read()
    else:
        _err("--result-file required when not in --agent-mode")

    if validate:
        try:
            return validate_agent_json(raw)
        except InvalidResultError as exc:
            _err(f"Invalid result JSON: {exc}")

    return raw


# ---------------------------------------------------------------------------
# Session loading helper
# ---------------------------------------------------------------------------

def _load_session(
    ctx_obj: Dict[str, Any],
    session_factory: type = HeadlessSession,
) -> HeadlessSession:
    session_id   = ctx_obj.get("session_id")
    session_file = ctx_obj.get("session_file")
    provider     = ctx_obj.get("provider")
    model        = ctx_obj.get("model")

    if session_file:
        return session_factory(session_file=session_file, provider=provider, model=model)

    if session_id:
        sessions = session_factory.list_sessions()
        match = next((s for s in sessions if s["session_id"] == session_id), None)
        if not match:
            _err(f"Session '{session_id}' not found.  Use 'session list' to see available sessions.")
        return session_factory(session_file=match["session_file"], provider=provider, model=model)

    _err("Either --session-id or --session-file is required.")


# ---------------------------------------------------------------------------
# Root group
# ---------------------------------------------------------------------------

@click.group()
@click.option("--provider",     default=None,  help="LLM provider (e.g. 'github', 'openai').")
@click.option("--model",        default=None,  help="LLM model name.")
@click.option("--session-id",   default=None,  help="Session identifier.")
@click.option("--session-file", default=None,  help="Path to session.json.", type=click.Path())
@click.option("--agent-mode",   is_flag=True,  help="Print PromptBundle; read LLM result from stdin.")
@click.option("--pretty",       is_flag=True,  help="Pretty-print JSON output.")
@click.pass_context
def cli(ctx, provider, model, session_id, session_file, agent_mode, pretty):
    """cv-builder CLI — create and manage customised CVs from the command line."""
    ctx.ensure_object(dict)
    ctx.obj.update(
        provider=provider,
        model=model,
        session_id=session_id,
        session_file=session_file,
        agent_mode=agent_mode,
        pretty=pretty,
    )


# ---------------------------------------------------------------------------
# session commands
# ---------------------------------------------------------------------------

@cli.group("session")
@click.pass_context
def session_grp(ctx):
    """Session lifecycle commands."""


@session_grp.command("new")
@click.option("--provider", default=None, help="Override LLM provider for this session.")
@click.option("--model",    default=None, help="Override LLM model for this session.")
@click.pass_context
def session_new(ctx, provider, model):
    """Create a new session and print its session_id."""
    p = provider or ctx.obj.get("provider")
    m = model    or ctx.obj.get("model")
    session = HeadlessSession(provider=p, model=m)
    sf = session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "session_file": sf}, ctx.obj["pretty"])


@session_grp.command("list")
@click.pass_context
def session_list(ctx):
    """List all saved sessions."""
    _out(HeadlessSession.list_sessions(), ctx.obj["pretty"])


@session_grp.command("status")
@click.pass_context
def session_status(ctx):
    """Print phase and key flags for the current session."""
    session = _load_session(ctx.obj)
    state   = session.state
    _out({
        "ok":                   True,
        "session_id":           session.session_id,
        "phase":                session.phase,
        "position_name":        state.get("position_name"),
        "has_job_text":         bool(state.get("job_description")),
        "has_job_analysis":     bool(state.get("job_analysis")),
        "has_customizations":   bool(state.get("customizations")),
        "has_pending_rewrites": bool(state.get("pending_rewrites")),
        "has_generated_files":  bool(state.get("generated_files")),
    }, ctx.obj["pretty"])


@session_grp.command("save")
@click.pass_context
def session_save(ctx):
    """Save the current session to disk."""
    session = _load_session(ctx.obj)
    sf = session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "session_file": sf}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# job commands
# ---------------------------------------------------------------------------

@cli.group("job")
def job_grp():
    """Job description intake commands."""


@job_grp.command("submit-text")
@click.option("--text",      default=None, help="Job description text (inline).")
@click.option("--text-file", default=None, help="Path to a .txt file containing the job description.",
              type=click.Path(exists=True))
@click.pass_context
def job_submit_text(ctx, text, text_file):
    """Submit a job description from text or a file."""
    if text_file:
        p = Path(text_file)
        try:
            size = p.stat().st_size
            if size > 1_048_576:
                _err(f"File too large ({size:,} bytes); 1 MB maximum.")
            job_text = p.read_text(encoding="utf-8")
        except PermissionError:
            _err(f"Permission denied reading {text_file!r}.")
        except UnicodeDecodeError:
            _err(f"{text_file!r} is not valid UTF-8 text (binary file?).")
        except OSError as exc:
            _err(f"Cannot read {text_file!r}: {exc}")
    elif text:
        job_text = text
    else:
        _err("Provide --text or --text-file.")
        return
    session = _load_session(ctx.obj)
    session.set_job_text(job_text)
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# analyze commands
# ---------------------------------------------------------------------------

@cli.group("analyze")
def analyze_grp():
    """Job analysis commands."""


@analyze_grp.command("run")
@click.pass_context
def analyze_run(ctx):
    """Run job analysis (requires --provider).  In --agent-mode, prints PromptBundle."""
    session = _load_session(ctx.obj)
    if ctx.obj["agent_mode"]:
        bundle = session.prepare_llm_call(OperationType.JOB_ANALYSIS)
        click.echo(bundle.to_json(indent=2))
    else:
        if not ctx.obj.get("provider"):
            _err("--provider required for non-agent-mode analysis.  Use --agent-mode to get PromptBundle.")
        session.run_with_llm(OperationType.JOB_ANALYSIS)
        session.save()
        _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "position_name": session.state.get("position_name")},
             ctx.obj["pretty"])


@analyze_grp.command("submit")
@click.option("--result-file", default=None, type=click.Path(),
              help="Path to JSON result file (default: read from stdin in agent mode).")
@click.pass_context
def analyze_submit(ctx, result_file):
    """Submit analysis result JSON.  Validates compliance before storing."""
    raw     = _read_result(ctx.obj, result_file)
    session = _load_session(ctx.obj)
    try:
        session.inject_llm_result(OperationType.JOB_ANALYSIS, raw)
    except InvalidResultError as exc:
        _err(f"Invalid result JSON: {exc}")
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "position_name": session.state.get("position_name")},
         ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# customize commands
# ---------------------------------------------------------------------------

@cli.group("customize")
def customize_grp():
    """Customization recommendation commands."""


@customize_grp.command("run")
@click.option("--prefs", default=None,
              help="JSON string of user preferences (e.g. '{\"tone\": \"technical\"}').")
@click.pass_context
def customize_run(ctx, prefs):
    """Generate CV customization recommendations.

    In --agent-mode, prints PromptBundle; otherwise calls LLM directly.
    """
    user_prefs = None
    if prefs:
        try:
            user_prefs = validate_agent_json(prefs)
        except InvalidResultError as exc:
            _err(f"Invalid --prefs JSON: {exc}")

    session = _load_session(ctx.obj)
    if ctx.obj["agent_mode"]:
        bundle = session.prepare_llm_call(OperationType.RECOMMENDATIONS, user_preferences=user_prefs)
        click.echo(bundle.to_json(indent=2))
    else:
        if not ctx.obj.get("provider"):
            _err("--provider required.  Use --agent-mode to get PromptBundle.")
        session.run_with_llm(OperationType.RECOMMENDATIONS, user_preferences=user_prefs)
        session.save()
        _out({"ok": True, "session_id": session.session_id, "phase": session.phase}, ctx.obj["pretty"])


@customize_grp.command("submit")
@click.option("--result-file", default=None, type=click.Path())
@click.pass_context
def customize_submit(ctx, result_file):
    """Submit recommendations result JSON."""
    raw     = _read_result(ctx.obj, result_file)
    session = _load_session(ctx.obj)
    try:
        session.inject_llm_result(OperationType.RECOMMENDATIONS, raw)
    except InvalidResultError as exc:
        _err(f"Invalid result JSON: {exc}")
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# rewrites commands
# ---------------------------------------------------------------------------

@cli.group("rewrites")
def rewrites_grp():
    """Rewrite proposal commands."""


@rewrites_grp.command("run")
@click.pass_context
def rewrites_run(ctx):
    """Request CV text rewrite proposals.

    In --agent-mode, prints PromptBundle; otherwise calls LLM directly.
    """
    session = _load_session(ctx.obj)
    if ctx.obj["agent_mode"]:
        bundle = session.prepare_llm_call(OperationType.REWRITE)
        click.echo(bundle.to_json(indent=2))
    else:
        _err("Direct LLM mode not yet implemented for rewrites.  Use --agent-mode.")


@rewrites_grp.command("submit")
@click.option("--result-file", default=None, type=click.Path())
@click.pass_context
def rewrites_submit(ctx, result_file):
    """Submit rewrite proposals JSON (must be a JSON array)."""
    raw     = _read_result(ctx.obj, result_file)
    session = _load_session(ctx.obj)
    try:
        session.inject_llm_result(OperationType.REWRITE, raw)
    except InvalidResultError as exc:
        _err(f"Invalid result JSON: {exc}")
    session.save()
    count = len(session.state.get("pending_rewrites") or [])
    _out({"ok": True, "session_id": session.session_id, "proposal_count": count, "phase": session.phase}, ctx.obj["pretty"])


@rewrites_grp.command("approve")
@click.option("--ids", required=True,
              help="JSON array of rewrite id strings to approve.")
@click.pass_context
def rewrites_approve(ctx, ids):
    """Approve a subset of pending rewrite proposals by id."""
    try:
        id_list = validate_agent_json(ids)
        if not isinstance(id_list, list):
            _err("--ids must be a JSON array")
    except InvalidResultError as exc:
        _err(f"Invalid --ids JSON: {exc}")
    session = _load_session(ctx.obj)
    counts  = session.approve_rewrites(id_list)
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, **counts}, ctx.obj["pretty"])


@rewrites_grp.command("list")
@click.pass_context
def rewrites_list(ctx):
    """Print pending rewrite proposals."""
    session = _load_session(ctx.obj)
    pending = session.state.get("pending_rewrites") or []
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "pending_rewrites": pending}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# decisions command
# ---------------------------------------------------------------------------

@cli.command("decisions")
@click.option("--file", "decisions_file", required=True, type=click.Path(exists=True),
              help="JSON file containing include/exclude decisions.")
@click.pass_context
def decisions_submit(ctx, decisions_file):
    """Apply user include/exclude decisions from a JSON file.

    The JSON file may contain any combination of:

    \\b
    {
      "experience_decisions":   { ... },
      "skill_decisions":        { ... },
      "achievement_decisions":  { ... },
      "publication_decisions":  { ... },
      "extra_skills":           [ ... ],
      "summary_focus_override": "ai_recommended"
    }
    """
    raw_text = Path(decisions_file).read_text(encoding="utf-8")
    try:
        data = validate_agent_json(raw_text)
    except InvalidResultError as exc:
        _err(f"Invalid decisions JSON: {exc}")

    session = _load_session(ctx.obj)
    session.apply_decisions(
        experience_decisions   = data.get("experience_decisions"),
        skill_decisions        = data.get("skill_decisions"),
        achievement_decisions  = data.get("achievement_decisions"),
        publication_decisions  = data.get("publication_decisions"),
        extra_skills           = data.get("extra_skills"),
        summary_focus_override = data.get("summary_focus_override"),
    )
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# generate command
# ---------------------------------------------------------------------------

@cli.command("generate")
@click.option("--html-only", is_flag=True, help="Generate HTML preview only (no PDF/DOCX).")
@click.pass_context
def generate(ctx, html_only):
    """Generate CV documents from current session state."""
    session = _load_session(ctx.obj)
    result  = session.generate_cv(html_preview_only=html_only)
    session.save()
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "generated_files": result}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# master commands
# ---------------------------------------------------------------------------

@cli.group("master")
def master_grp():
    """Master CV data management commands."""


@master_grp.command("get")
@click.option("--section", default=None, help="Top-level section to fetch (omit for full data).")
@click.pass_context
def master_get(ctx, section):
    """Print master CV data as JSON."""
    from utils.master_data_manager import MasterDataManager
    mgr = MasterDataManager()
    try:
        data = mgr.read(section)
    except FileNotFoundError:
        _err(f"Master CV data not found at {mgr.path}")
    except KeyError as exc:
        _err(str(exc))
    _out({"ok": True, "data": data}, ctx.obj["pretty"])


@master_grp.command("update-section")
@click.option("--section", required=True, help="Top-level section key to update.")
@click.option("--data-file", required=True, type=click.Path(exists=True),
              help="JSON file containing new section value.")
@click.pass_context
def master_update_section(ctx, section, data_file):
    """Update a master CV section from a JSON file.

    Phase guard: only permitted during 'init' or 'refinement' phase.
    """
    raw_text = Path(data_file).read_text(encoding="utf-8")
    try:
        data = validate_agent_json(raw_text)
    except InvalidResultError as exc:
        _err(f"Invalid JSON: {exc}")
    session = _load_session(ctx.obj)
    try:
        session.update_master_section(section, data)
    except ValueError as exc:
        _err(str(exc))
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "section": section}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# quality check commands
# ---------------------------------------------------------------------------

@cli.group("quality")
def quality_grp():
    """Spell-check and persuasion quality commands."""


@quality_grp.command("spell-check")
@click.option("--text-file", default=None, type=click.Path(exists=True),
              help="Text file to check.  Defaults to session customizations.")
@click.option("--result-file", default=None, type=click.Path(),
              help="Write corrections JSON here (default: stdout).")
@click.pass_context
def spell_check(ctx, text_file, result_file):
    """Spell-check CV text in --agent-mode (prints PromptBundle)."""
    text    = Path(text_file).read_text(encoding="utf-8") if text_file else None
    session = _load_session(ctx.obj)
    if ctx.obj["agent_mode"]:
        bundle = session.prepare_llm_call(OperationType.SPELL_CHECK, text=text)
        click.echo(bundle.to_json(indent=2))
    else:
        _err("Direct LLM mode not implemented for spell-check.  Use --agent-mode.")


@quality_grp.command("spell-check-submit")
@click.option("--result-file", default=None, type=click.Path())
@click.pass_context
def spell_check_submit(ctx, result_file):
    """Submit spell-check corrections JSON."""
    raw     = _read_result(ctx.obj, result_file)
    session = _load_session(ctx.obj)
    try:
        session.inject_llm_result(OperationType.SPELL_CHECK, raw)
    except InvalidResultError as exc:
        _err(f"Invalid result JSON: {exc}")
    session.save()
    count = len(session.state.get("spell_check_results") or [])
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "correction_count": count}, ctx.obj["pretty"])


@quality_grp.command("persuasion-check")
@click.option("--text-file", default=None, type=click.Path(exists=True))
@click.pass_context
def persuasion_check(ctx, text_file):
    """Persuasion quality check in --agent-mode (prints PromptBundle)."""
    text    = Path(text_file).read_text(encoding="utf-8") if text_file else None
    session = _load_session(ctx.obj)
    if ctx.obj["agent_mode"]:
        bundle = session.prepare_llm_call(OperationType.PERSUASION_CHECK, text=text)
        click.echo(bundle.to_json(indent=2))
    else:
        _err("Direct LLM mode not implemented for persuasion-check.  Use --agent-mode.")


@quality_grp.command("persuasion-check-submit")
@click.option("--result-file", default=None, type=click.Path())
@click.pass_context
def persuasion_check_submit(ctx, result_file):
    """Submit persuasion-check warnings JSON."""
    raw     = _read_result(ctx.obj, result_file)
    session = _load_session(ctx.obj)
    try:
        session.inject_llm_result(OperationType.PERSUASION_CHECK, raw)
    except InvalidResultError as exc:
        _err(f"Invalid result JSON: {exc}")
    session.save()
    count = len(session.state.get("persuasion_warnings") or [])
    _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "warning_count": count}, ctx.obj["pretty"])


# ---------------------------------------------------------------------------
# chat command
# ---------------------------------------------------------------------------

@cli.command("chat")
@click.argument("message", required=False)
@click.option("--result-file", default=None, type=click.Path(),
              help="Path to JSON result file to submit (agent-mode submit).")
@click.pass_context
def chat(ctx, message, result_file):
    """Chat with the CV assistant.

    In --agent-mode with MESSAGE, prints a PromptBundle for the agent.
    With --result-file, submits the agent's response.
    """
    session = _load_session(ctx.obj)
    if result_file or (not ctx.obj["agent_mode"] and not message):
        # Submit mode
        raw = _read_result(ctx.obj, result_file)
        if message:
            session.add_to_history("user", message)
        try:
            session.inject_llm_result(OperationType.CHAT, raw)
        except InvalidResultError as exc:
            _err(f"Invalid result JSON: {exc}")
        session.save()
        last = session.conversation_history[-1] if session.conversation_history else {}
        _out({"ok": True, "session_id": session.session_id, "phase": session.phase, "response": last.get("content", "")}, ctx.obj["pretty"])
    else:
        if not message:
            _err("MESSAGE required for agent-mode chat bundle generation.")
        bundle = session.prepare_llm_call(OperationType.CHAT, message=message)
        click.echo(bundle.to_json(indent=2))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Entry point registered in pyproject.toml as ``cv-cli``."""
    cli(auto_envvar_prefix="CV_CLI")


if __name__ == "__main__":
    main()
