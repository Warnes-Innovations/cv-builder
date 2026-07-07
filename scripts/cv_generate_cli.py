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
    #   conda activate cvgen && python scripts/web_app.py --llm-provider github
    #
    # Then run this CLI:
    python scripts/cv_generate_cli.py --mode comprehensive
    python scripts/cv_generate_cli.py --mode focused
    python scripts/cv_generate_cli.py --mode comprehensive --job-file path/to/job.txt
    python scripts/cv_generate_cli.py --base-url http://127.0.0.1:5000 --mode focused --dry-run

Modes
-----
comprehensive
    All experience entries, all achievements, all skills, full publications.
    Uses the ``scientific_advisor`` professional summary.

focused
    Highlights Pfizer, Boehringer Ingelheim, Medidata, Novartis, Warnes Innovations.
    Excludes older / less relevant roles.
    Uses the ``scientific_advisor`` professional summary.
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
import time
from pathlib import Path
from typing import Any

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
        resp = requests.post(url, json=payload, timeout=timeout)
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
        resp = requests.get(url, params=params or {}, timeout=timeout)
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
    dry_run: bool = False,
) -> dict[str, Any]:
    """Drive the full generation workflow and return final output info."""

    master = _load_master_data(master_cv_path)

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

    _step("Setting summary variant: scientific_advisor")
    _p("/api/review-decisions", {"type": "summary_focus", "decisions": "scientific_advisor"})
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
    if not args.dry_run:
        try:
            requests.get(f"{args.base_url.rstrip('/')}/api/models", timeout=5)
        except requests.RequestException:
            print(
                f"ERROR: cv-builder app not reachable at {args.base_url}\n"
                "  Start it with: conda activate cvgen && python scripts/web_app.py --llm-provider github",
                file=sys.stderr,
            )
            sys.exit(1)

    print(f"\ncv_generate_cli — mode: {args.mode}")
    print(f"  job source : {'file: ' + args.job_file if args.job_file else 'built-in generic pharma JD'}")
    print(f"  target     : {args.base_url}")

    t0 = time.monotonic()
    try:
        result = run_generation(
            base_url=args.base_url,
            mode=args.mode,
            job_text=job_text,
            master_cv_path=args.master_cv,
            publications_path=args.publications,
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
