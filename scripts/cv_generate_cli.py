# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""
cv_generate_cli.py — Headless CV generation driver

Drives the cv-builder REST API end-to-end from the command line:
  analyze → recommend → apply decisions → generate preview → confirm → generate final

Usage
-----
    # Start the app first (separate terminal):
    #   conda activate cvgen && python scripts/web_app.py
    # or, where the launchd service is installed:
    #   launchd/restart.sh
    #
    # Then run this CLI:
    python scripts/cv_generate_cli.py --mode comprehensive --summary-variant scientific_advisor
    python scripts/cv_generate_cli.py --mode focused --summary-variant federal_advisor
    python scripts/cv_generate_cli.py --mode comprehensive --summary-variant federal_advisor \
        --job-file path/to/job.txt
    python scripts/cv_generate_cli.py --base-url http://127.0.0.1:5055 --mode focused \
        --summary-variant scientific_advisor --dry-run

The summary variant is required; it is validated against the keys present in
Master_CV_Data.json and the run aborts on an unknown one.

Modes
-----
comprehensive
    All experience entries, all achievements, all skills, full publications.

focused
    Highlights Pfizer, Boehringer Ingelheim, Medidata, Novartis, Warnes Innovations.
    Excludes older / less relevant roles.
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import socket
import sys
import textwrap
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

# ---------------------------------------------------------------------------
# Generic pharma scientific advisor job description (used when no --job-file)
# ---------------------------------------------------------------------------
_DEFAULT_JOB_DESCRIPTION = textwrap.dedent("""\
    Senior Biostatistician / Scientific Advisor — Pharmaceutical Research
    Location: Remote / Hybrid

    We are seeking an experienced Senior Biostatistician and Scientific Advisor
    to lead statistical strategy across our pharmaceutical research portfolio.

    Key Responsibilities:
    - Lead statistical analysis for non-clinical and clinical studies
    - Provide biostatistical consulting and scientific advisory services
    - Design and implement genomic analysis workflows (RNA-Seq, scRNA-Seq, multi-omics)
    - Ensure CDISC compliance for clinical data integration
    - Mentor and guide scientific teams on statistical methodology
    - Develop and maintain production-grade R/Bioconductor pipelines
    - Review Phase Gate submissions for data quality and statistical rigor

    Requirements:
    - Ph.D. in Biostatistics, Statistics, or related field
    - 15+ years of pharmaceutical research experience
    - Deep expertise in genomics, bioinformatics, and experimental design
    - Strong R programming skills; Bioconductor experience required
    - CDISC/clinical data standards knowledge
    - Experience spanning the full drug development lifecycle
    - Excellent scientific communication and cross-functional leadership skills

    Preferred Qualifications:
    - Experience with scRNA-Seq and multi-omics analysis
    - Track record of R package development and Bioconductor contributions
    - Leadership experience in pharmaceutical and academic research environments
    - Familiarity with CI/CD workflows and reproducible research practices
""")

# ---------------------------------------------------------------------------
# Experience decisions per mode
# ---------------------------------------------------------------------------
# Values: "emphasize" | "include" | "de-emphasize" | "exclude"
_EXPERIENCE_DECISIONS: dict[str, dict[str, str]] = {
    "comprehensive": {
        "exp_001": "include",       # Stealth Startup CTO (2024-2025)
        "exp_002": "emphasize",     # Warnes Innovations (consulting)
        "exp_003": "de-emphasize",  # Warnes Wireless (patents / RF)
        "exp_004": "include",       # Torqata (ML / SaaS)
        "exp_005": "emphasize",     # Medidata (bioinformatics / clinical)
        "exp_006": "emphasize",     # Boehringer Ingelheim (pharma biostat)
        "exp_007": "emphasize",     # Novartis (PK/PD modeling)
        "exp_007a": "include",      # Center for Research Computing, U Rochester
        "exp_008": "include",       # U Rochester (faculty)
        "exp_008a": "include",      # Revolution Analytics (co-founder)
        "exp_009": "emphasize",     # Pfizer (non-clinical stats)
        "exp_010": "include",       # Bell Labs (intern)
        "exp_011": "de-emphasize",  # InsurQuote (early career)
        "exp_012": "de-emphasize",  # BYU RA
        "exp_013": "include",       # U Washington RA
        "exp_014": "include",       # Fred Hutchinson RA
    },
    "focused": {
        "exp_001": "exclude",       # Stealth Startup
        "exp_002": "emphasize",     # Warnes Innovations
        "exp_003": "exclude",       # Warnes Wireless
        "exp_004": "exclude",       # Torqata
        "exp_005": "emphasize",     # Medidata
        "exp_006": "emphasize",     # Boehringer Ingelheim
        "exp_007": "emphasize",     # Novartis
        "exp_007a": "exclude",      # Research Computing
        "exp_008": "exclude",       # U Rochester faculty
        "exp_008a": "include",      # Revolution Analytics (co-founder, brief)
        "exp_009": "emphasize",     # Pfizer
        "exp_010": "exclude",       # Bell Labs
        "exp_011": "exclude",       # InsurQuote
        "exp_012": "exclude",       # BYU RA
        "exp_013": "exclude",       # U Washington RA
        "exp_014": "exclude",       # Fred Hutchinson RA
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class APIError(RuntimeError):
    """Raised when the cv-builder API returns an error."""


def _post(base_url: str, path: str, payload: dict[str, Any], timeout: int = 120) -> dict[str, Any]:
    url = base_url.rstrip("/") + path
    try:
        resp = requests.post(url, json=payload, timeout=timeout, allow_redirects=False)
    except requests.RequestException as exc:
        raise APIError(f"POST {path} failed: {exc}") from exc
    try:
        data = resp.json()
    except ValueError:
        raise APIError(f"POST {path} → non-JSON response (HTTP {resp.status_code}): {resp.text[:200]}")
    if resp.status_code >= 400:
        err = data.get("error") or data.get("message") or resp.text[:200]
        raise APIError(f"POST {path} → HTTP {resp.status_code}: {err}")
    return data


def _get(base_url: str, path: str, params: dict | None = None, timeout: int = 30) -> dict[str, Any]:
    url = base_url.rstrip("/") + path
    try:
        resp = requests.get(url, params=params or {}, timeout=timeout, allow_redirects=False)
    except requests.RequestException as exc:
        raise APIError(f"GET {path} failed: {exc}") from exc
    try:
        data = resp.json()
    except ValueError:
        raise APIError(f"GET {path} → non-JSON response (HTTP {resp.status_code}): {resp.text[:200]}")
    if resp.status_code >= 400:
        err = data.get("error") or resp.text[:200]
        raise APIError(f"GET {path} → HTTP {resp.status_code}: {err}")
    return data


def _step(label: str) -> None:
    print(f"\n{'─' * 60}\n▶  {label}")


def _ok(detail: str = "") -> None:
    suffix = f"  ({detail})" if detail else ""
    print(f"   ✓{suffix}")


# ---------------------------------------------------------------------------
# Master-data helpers (local read — never writes)
# ---------------------------------------------------------------------------

def _load_master_data(path: str | Path) -> dict[str, Any]:
    p = Path(path).expanduser()
    if not p.exists():
        raise FileNotFoundError(f"Master CV not found: {p}")
    with p.open(encoding="utf-8") as fh:
        return json.load(fh)


def _is_loopback(base_url: str) -> bool:
    """True when `base_url`'s host resolves to loopback.

    Resolves the name rather than string-matching "localhost": a hostname can
    point anywhere, and the question is where the bytes actually go.
    """
    host = urlparse(base_url).hostname
    if not host:
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    return all(ipaddress.ip_address(i[4][0]).is_loopback for i in infos)


def _require_cv_builder(base_url: str, allow_remote: bool = False) -> dict[str, Any]:
    """Abort unless `base_url` is a live cv-builder app, and say which it isn't.

    Probes ``GET /api/status``, which answers ``{"alive": true, ...}``.

    WHAT THIS CAN AND CANNOT ESTABLISH
    ----------------------------------
    It confirms a cv-builder-SHAPED status payload from a host this CLI is
    willing to talk to. It is not authentication: the app has none, so no probe
    can supply it. A host answering ``{"alive": true}`` passes the payload
    check — which is why the loopback bound below, not the payload, is the
    control that actually holds. It also does not establish a compatible
    version, or a working LLM provider.

    THE THREE DEFECTS THIS SHAPE EXISTS TO AVOID, each found by running it
    ---------------------------------------------------------------------
    1. The version before this one requested ``/api/models`` — an endpoint this
       app has never served — and caught only ``RequestException``, so a 404
       counted as success. It confirmed something held the port, not that it was
       cv-builder. Pointed at macOS ControlCenter on :5000, it passed.
    2. Its replacement accepted any JSON carrying an ``alive`` key, including
       ``alive: false``. A forty-line impostor server drove the whole CLI to
       exit 0. Hence ``is not True`` rather than a membership test, and hence
       the host bound.
    3. ``requests`` follows redirects by default, so the host that PASSED the
       probe need not be the host that RECEIVES the data — demonstrated with a
       302/307 pair that satisfied the check from host B while every workflow
       POST went to host A. Hence ``allow_redirects=False`` here AND in
       ``_post``/``_get``: a probe the caller can redirect is not a probe.

    The loopback default is not a new policy. ``web_app.py`` already enforces
    loopback as this app's trust boundary on the INBOUND side (GAP-55,
    ``CV_WEB_HOST``/``CV_ALLOWED_HOSTS``); this is the same boundary applied
    outbound, so the two directions agree.
    """
    if not allow_remote and not _is_loopback(base_url):
        print(
            f"ERROR: refusing to talk to a non-loopback host: {base_url}\n"
            "  This CLI posts your job description, every skill name from your CV,\n"
            "  publication cite keys and your per-role emphasis decisions to this\n"
            "  address. cv-builder has no authentication, so the host bound is the\n"
            "  only thing deciding where that goes.\n"
            "  Pass --allow-remote if you genuinely mean to target another machine.",
            file=sys.stderr,
        )
        sys.exit(4)

    url = base_url.rstrip("/") + "/api/status"
    start_hint = (
        "  If the launchd service is installed:  launchd/restart.sh\n"
        "    (it can take ~60s to begin serving; re-run the CLI after that)\n"
        "  Otherwise, and ONLY if nothing is already serving:\n"
        "    conda activate cvgen && python scripts/web_app.py\n"
        "    WARNING: that entry point calls _evict_port(), which SIGTERMs every\n"
        "    process holding the port — including a browser tab connected to it."
    )
    wrong_host_hint = (
        "  Check --base-url: the default is http://127.0.0.1:5001.\n"
        "  On macOS, AirPlay Receiver holds :5000 and answers HTTP 403."
    )
    not_ours = "  Something is listening there, but it is not a cv-builder app."

    try:
        # allow_redirects=False: see defect 3 above. A redirect means the host
        # that answers is not the host we are about to send data to.
        resp = requests.get(url, timeout=5, allow_redirects=False)
    except requests.Timeout:
        print(
            f"ERROR: {base_url} accepted the connection but did not answer "
            "/api/status within 5s.\n"
            "  It may still be starting, or be wedged. Check the log:\n"
            "    tail -f ~/Library/Logs/cv-builder/launchd-stderr.log",
            file=sys.stderr,
        )
        sys.exit(3)
    except requests.RequestException as exc:
        print(
            f"ERROR: nothing reachable at {base_url} ({exc.__class__.__name__})\n"
            f"{start_hint}",
            file=sys.stderr,
        )
        sys.exit(3)

    # Explicit status range rather than resp.is_redirect: that property is a
    # requests convenience a MagicMock fakes as truthy, so a test double would
    # silently take this branch. The status code is the fact; the property is a
    # reading of it.
    if 300 <= resp.status_code < 400:
        print(
            f"ERROR: {base_url} redirected /api/status to "
            f"{resp.headers.get('Location', '<no Location header>')}.\n"
            "  --base-url must name the app directly, not a redirector: the host\n"
            "  that answers a redirected probe is not the host that receives the\n"
            "  data, and a 307 delivers the body to both.\n"
            f"{wrong_host_hint}",
            file=sys.stderr,
        )
        sys.exit(4)

    if resp.status_code >= 500:
        print(
            f"ERROR: {base_url} answered HTTP {resp.status_code} for /api/status.\n"
            "  cv-builder appears to be running but its /api/status handler failed.\n"
            "  Check the log: tail -f ~/Library/Logs/cv-builder/launchd-stderr.log",
            file=sys.stderr,
        )
        sys.exit(3)

    if resp.status_code >= 400:
        print(
            f"ERROR: {base_url} answered HTTP {resp.status_code} for /api/status.\n"
            f"{not_ours}\n"
            f"{wrong_host_hint}",
            file=sys.stderr,
        )
        sys.exit(4)

    try:
        data = resp.json()
    except ValueError:
        print(
            f"ERROR: {base_url} returned non-JSON from /api/status.\n"
            f"{not_ours}\n"
            f"{wrong_host_hint}",
            file=sys.stderr,
        )
        sys.exit(4)

    # `is not True`, not `"alive" in data`: the field is named for a claim, so
    # check the claim. A host answering alive:false was previously accepted.
    if not isinstance(data, dict) or data.get("alive") is not True:
        print(
            f"ERROR: {base_url} did not report alive:true from /api/status.\n"
            f"{not_ours}\n"
            f"{wrong_host_hint}",
            file=sys.stderr,
        )
        sys.exit(4)

    return data


def _available_summary_variants(master: dict[str, Any]) -> list[str]:
    """Summary variant keys present in the master data, in declaration order."""
    summaries = master.get("professional_summaries")
    if isinstance(summaries, dict):
        return list(summaries.keys())
    return []


# Focus values the SERVER creates during a run, which therefore never appear in
# Master_CV_Data.json. Validating only against the master file rejects these —
# and `ai_recommended` is produced by the recommend phase THIS CLI triggers, so
# the guard refused a value its own workflow generates. Both are documented in
# .github/skills/cv-builder-workflow/SKILL.md as valid summary_focus_override
# values.
_SESSION_CREATED_VARIANTS = ("ai_recommended", "ai_generated")


def _resolve_summary_variant(master: dict[str, Any], requested: str) -> str:
    """Validate `requested` against the master data, or fail with the real options.

    Do not relax this into a silent fallback. The API accepts any string for
    summary_focus, so an unrecognised variant posts successfully and the CV is
    generated with whatever summary the backend defaults to — a wrong document
    that looks like a right one. Failing here is the only place the mistake is
    still visible.
    """
    available = _available_summary_variants(master)
    if not available:
        raise SystemExit(
            "ERROR: master data has no object-form 'professional_summaries'; "
            "cannot select a summary variant."
        )
    if requested in _SESSION_CREATED_VARIANTS:
        return requested
    if requested not in available:
        raise SystemExit(
            f"ERROR: unknown summary variant {requested!r}.\n"
            f"  from master data: {', '.join(available)}\n"
            f"  created during a run: {', '.join(_SESSION_CREATED_VARIANTS)}"
        )
    return requested


def _all_achievement_ids(master: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for exp in master.get("experience", []):
        for ach in exp.get("achievements", []):
            if ach.get("id"):
                ids.append(ach["id"])
    return ids


def _all_skill_names(master: dict[str, Any]) -> list[str]:
    skills = master.get("skills", {})
    names: list[str] = []
    if isinstance(skills, list):
        for s in skills:
            if isinstance(s, dict) and s.get("name"):
                names.append(s["name"])
            elif isinstance(s, str):
                names.append(s)
    elif isinstance(skills, dict):
        for _cat_key, cat_val in skills.items():
            # Structure: {cat_key: {"category": "...", "skills": [{"name": ...}, ...]}}
            if isinstance(cat_val, dict):
                items = cat_val.get("skills", [])
            elif isinstance(cat_val, list):
                items = cat_val
            else:
                continue
            for item in items:
                if isinstance(item, dict) and item.get("name"):
                    names.append(item["name"])
                elif isinstance(item, str):
                    names.append(item)
    return names


def _build_achievement_decisions(
    master: dict[str, Any],
    mode: str,
) -> dict[str, str]:
    """Include all achievements for comprehensive; focused excludes excluded-experience achievements."""
    excluded_exps: set[str] = set()
    if mode == "focused":
        exp_dec = _EXPERIENCE_DECISIONS["focused"]
        excluded_exps = {eid for eid, v in exp_dec.items() if v == "exclude"}

    decisions: dict[str, str] = {}
    for exp in master.get("experience", []):
        eid = exp.get("id", "")
        for ach in exp.get("achievements", []):
            aid = ach.get("id", "")
            if not aid:
                continue
            imp = ach.get("importance", 5)
            if eid in excluded_exps:
                decisions[aid] = "exclude"
            elif imp >= 9:
                decisions[aid] = "emphasize"
            else:
                decisions[aid] = "include"
    return decisions


def _build_skill_decisions(master: dict[str, Any]) -> dict[str, str]:
    """Include all skills."""
    names = _all_skill_names(master)
    return {name: "include" for name in names}


def _build_publication_decisions(
    master: dict[str, Any],
    publications_path: str | Path,
    mode: str,
) -> dict[str, bool] | None:
    """Return None (accept LLM recommendation) or a cite_key → bool map."""
    try:
        import sys as _sys
        # Try to import the project's bibtex_parser to get cite keys
        cv_builder_scripts = Path(__file__).parent
        if str(cv_builder_scripts) not in _sys.path:
            _sys.path.insert(0, str(cv_builder_scripts))
        if str(cv_builder_scripts / "utils") not in _sys.path:
            _sys.path.insert(0, str(cv_builder_scripts / "utils"))
        from utils.bibtex_parser import parse_bibtex_file
        pubs = parse_bibtex_file(str(Path(publications_path).expanduser()))
        if not pubs:
            return None
        return {k: True for k in pubs}   # accept all
    except Exception as exc:  # noqa: BLE001
        print(f"   ⚠ Could not parse publications (will let LLM decide): {exc}", file=__import__('sys').stderr)
        return None   # Let the LLM decide


# ---------------------------------------------------------------------------
# Main workflow
# ---------------------------------------------------------------------------

def run_generation(
    base_url: str,
    mode: str,
    job_text: str,
    master_cv_path: str,
    publications_path: str,
    summary_variant: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Drive the full generation workflow and return final output info."""

    master = _load_master_data(master_cv_path)
    summary_variant = _resolve_summary_variant(master, summary_variant)

    exp_decisions   = _EXPERIENCE_DECISIONS[mode]
    ach_decisions   = _build_achievement_decisions(master, mode)
    skill_decisions = _build_skill_decisions(master)
    pub_decisions   = _build_publication_decisions(master, publications_path, mode)

    if dry_run:
        print(f"\n[dry-run] Would generate {mode} CV via {base_url}")
        print(f"  experiences: {len([v for v in exp_decisions.values() if v != 'exclude'])} included")
        print(f"  achievements: {len([v for v in ach_decisions.values() if v != 'exclude'])} included")
        print(f"  skills: {len(skill_decisions)} included")
        if pub_decisions:
            print(f"  publications: {len(pub_decisions)} included")
        return {}

    # ------------------------------------------------------------------
    # Step 1 — Create session
    # ------------------------------------------------------------------
    _step("Creating session")
    r = _post(base_url, "/api/sessions/new", {})
    sid = r["session_id"]
    _ok(f"session_id={sid}")

    def _p(path: str, payload: dict, timeout: int = 120) -> dict:
        return _post(base_url, path, {"session_id": sid, **payload}, timeout=timeout)

    # ------------------------------------------------------------------
    # Step 2 — Submit job description
    # ------------------------------------------------------------------
    _step("Submitting job description")
    _p("/api/job", {"job_text": job_text})
    _ok()

    # ------------------------------------------------------------------
    # Step 3 — Analyze job (LLM call — may take 10-30s)
    # ------------------------------------------------------------------
    _step("Analyzing job description (LLM call…)")
    r = _p("/api/action", {"action": "analyze_job"})
    phase = r.get("phase", "?")
    result = r.get("result", {})
    text  = result.get("text", "") if isinstance(result, dict) else str(result)
    _ok(f"phase={phase}")
    if text:
        first_line = text.splitlines()[0][:100]
        print(f"   → {first_line}")

    # ------------------------------------------------------------------
    # Step 4 — Advance workflow state to 'recommend' phase (LLM call)
    # The server's recommendations are intentionally discarded here; all
    # decisions are supplied explicitly by the caller in Step 5.
    # ------------------------------------------------------------------
    _step("Advancing to recommend phase (LLM call…)")
    _p("/api/action", {"action": "recommend_customizations", "user_preferences": {}})
    _ok()

    # ------------------------------------------------------------------
    # Step 5 — Apply decisions
    # ------------------------------------------------------------------
    _step("Applying experience decisions")
    _p("/api/review-decisions", {"type": "experiences", "decisions": exp_decisions})
    inc = len([v for v in exp_decisions.values() if v != "exclude"])
    _ok(f"{inc}/{len(exp_decisions)} experiences included")

    _step("Applying achievement decisions")
    _p("/api/review-decisions", {"type": "achievements", "decisions": ach_decisions})
    inc = len([v for v in ach_decisions.values() if v != "exclude"])
    _ok(f"{inc}/{len(ach_decisions)} achievements included")

    _step("Applying skill decisions")
    _p("/api/review-decisions", {"type": "skills", "decisions": skill_decisions})
    _ok(f"{len(skill_decisions)} skills included")

    if pub_decisions:
        _step("Applying publication decisions")
        _p("/api/review-decisions", {"type": "publications", "decisions": pub_decisions})
        _ok(f"{len(pub_decisions)} publications included")

    _step(f"Setting summary variant: {summary_variant}")
    _p("/api/review-decisions", {"type": "summary_focus", "decisions": summary_variant})
    _ok()

    # ------------------------------------------------------------------
    # Step 6 — Trigger initial CV generation (sets output dir, html_preview_only)
    # ------------------------------------------------------------------
    _step("Generating CV structure (sets output directory…)")
    _p("/api/action", {"action": "generate_cv"}, timeout=400)
    _ok()

    # ------------------------------------------------------------------
    # Step 7 — Generate HTML preview
    # ------------------------------------------------------------------
    _step("Generating HTML preview")
    r = _p("/api/cv/generate-preview", {}, timeout=300)
    page_count = r.get("page_count_exact") or r.get("page_count_estimate")
    _ok(f"pages≈{page_count}" if page_count else "")

    # ------------------------------------------------------------------
    # Step 8 — Confirm layout
    # ------------------------------------------------------------------
    _step("Confirming layout")
    _p("/api/cv/confirm-layout", {})
    _ok()

    # ------------------------------------------------------------------
    # Step 9 — Generate final documents
    # ------------------------------------------------------------------
    _step("Generating final documents (HTML + PDF + DOCX)…")
    r = _p("/api/cv/generate-final", {}, timeout=400)
    outputs = r.get("outputs", {})
    page_count = r.get("page_count_exact") or r.get("page_count_estimate")
    _ok(f"pages={page_count}" if page_count else "")

    return {"session_id": sid, "outputs": outputs, "page_count": page_count}


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Headless cv-builder API driver",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--mode",
        choices=["comprehensive", "focused"],
        required=True,
        help="comprehensive = all experience; focused = Pfizer/BI/Medidata/Novartis/Warnes Innovations",
    )
    p.add_argument(
        "--summary-variant",
        required=True,
        metavar="KEY",
        help=(
            "professional_summaries key to use (e.g. scientific_advisor, federal_advisor). "
            "Required and validated against the master data: there is deliberately no default, "
            "because the summary is the most role-specific text on the CV and a silent default "
            "produces a plausible document aimed at the wrong audience."
        ),
    )
    p.add_argument(
        "--allow-remote",
        action="store_true",
        help=(
            "permit a non-loopback --base-url. Off by default: this CLI posts job "
            "text, every skill name, cite keys and per-role emphasis decisions to "
            "that address, and cv-builder has no authentication, so the host bound "
            "is the only control on where it goes."
        ),
    )
    p.add_argument(
        "--base-url",
        default="http://127.0.0.1:5001",
        help="cv-builder web app base URL (default: http://127.0.0.1:5001)",
    )
    p.add_argument(
        "--job-file",
        default=None,
        metavar="PATH",
        help="Path to a job description text file (default: built-in generic pharma JD)",
    )
    p.add_argument(
        "--master-cv",
        default="~/CV/Master_CV_Data.json",
        metavar="PATH",
        help="Path to Master_CV_Data.json (default: ~/CV/Master_CV_Data.json)",
    )
    p.add_argument(
        "--publications",
        default="~/CV/publications.bib",
        metavar="PATH",
        help="Path to publications.bib (default: ~/CV/publications.bib)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Show decisions that would be applied without calling the API",
    )
    return p.parse_args()


def main() -> None:
    args = _parse_args()

    if args.job_file:
        job_path = Path(args.job_file).expanduser()
        if not job_path.exists():
            print(f"ERROR: job file not found: {job_path}", file=sys.stderr)
            sys.exit(1)
        job_text = job_path.read_text(encoding="utf-8")
    else:
        job_text = _DEFAULT_JOB_DESCRIPTION

    # Verify app is reachable (unless dry-run)
    status: dict[str, Any] = {}
    if not args.dry_run:
        status = _require_cv_builder(args.base_url, allow_remote=args.allow_remote)

    print(f"\ncv_generate_cli — mode: {args.mode}")
    print(f"  job source : {'file: ' + args.job_file if args.job_file else 'built-in generic pharma JD'}")
    print(f"  target     : {args.base_url}")
    if status:
        # The probe already fetched these, and they decide what the generated CV
        # actually says. Printing them is the one moment the operator can still
        # abort on seeing the wrong provider — a launchd-started instance uses
        # whatever config.yaml said at boot, not what you expect right now.
        provider = status.get("llm_provider") or "unknown"
        model = status.get("llm_model") or "unknown"
        print(f"  llm        : {provider} / {model}")

    t0 = time.monotonic()
    try:
        result = run_generation(
            base_url=args.base_url,
            mode=args.mode,
            job_text=job_text,
            master_cv_path=args.master_cv,
            publications_path=args.publications,
            summary_variant=args.summary_variant,
            dry_run=args.dry_run,
        )
    except APIError as exc:
        print(f"\n✗ API error: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  Interrupted.", file=sys.stderr)
        sys.exit(130)

    elapsed = time.monotonic() - t0

    if args.dry_run or not result:
        return

    print(f"\n{'═' * 60}")
    print(f"✓ Done ({elapsed:.0f}s)  session_id={result.get('session_id')}")
    outputs = result.get("outputs") or {}
    for key in ("final_html", "final_pdf", "ats_docx", "human_docx"):
        val = outputs.get(key)
        if val:
            print(f"  {key:12s}: {val}")


if __name__ == "__main__":
    main()
