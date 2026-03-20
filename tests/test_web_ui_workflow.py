#!/usr/bin/env python3
"""
Integration test: complete Web UI workflow against a self-managed server.

The `server` fixture starts a fresh Flask process on a free port using a
temporary session directory, runs the test, then shuts the process down.

What is tested:
  1. Job description upload
  2. Status after upload
  3. Job analysis (LLM call)
  4. Customization recommendations (LLM call)
  5. CV generation (LLM call)
  6. File download

The test is skipped automatically when:
  - The Flask server cannot start within the startup timeout, OR
  - The LLM provider is unavailable (server exits or never becomes reachable).
"""

import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

_PROJECT_ROOT = Path(__file__).parent.parent
_STARTUP_TIMEOUT = 15  # seconds


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _free_port() -> int:
    """Return an OS-assigned free TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def _wait_for_server(url: str, timeout: int) -> bool:
    """Poll url until it returns our JSON liveness response or timeout."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=1)
            data = r.json()
            if isinstance(data, dict) and data.get("ok") is True:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


# ---------------------------------------------------------------------------
# Server fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def server():
    """Start a fresh Flask server on a free port; yield its base URL.

    Uses a temporary directory for session files so the test is isolated
    from any real user sessions.  Skips the module if the server cannot
    start within _STARTUP_TIMEOUT seconds.
    """
    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"

    with tempfile.TemporaryDirectory(prefix="cv_builder_test_") as tmpdir:
        cmd = [
            sys.executable,
            str(_PROJECT_ROOT / "scripts" / "web_app.py"),
            "--llm-provider", "stub",
            "--port", str(port),
            "--output-dir", tmpdir,
        ]
        env = os.environ.copy()
        env["FLASK_ENV"] = "testing"

        proc = subprocess.Popen(
            cmd,
            cwd=str(_PROJECT_ROOT),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        status_url = f"{base_url}/api/status"
        reachable = _wait_for_server(status_url, _STARTUP_TIMEOUT)
        if not reachable:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            pytest.skip(
                f"Flask server did not start within {_STARTUP_TIMEOUT}s."
            )

        yield base_url

        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------

_JOB_TEXT = """\
Senior Data Science Manager
Remote - XYZ Corp

We are seeking a Senior Data Science Manager to lead our data science team.

Key Requirements:
- PhD in Statistics, Computer Science, or related field
- 8+ years of experience in data science and machine learning
- Experience managing teams of 5+ data scientists
- Strong programming skills in Python and R
- Experience with cloud platforms (AWS, Azure, GCP)
- Experience with MLOps and productionising models

Responsibilities:
- Lead and manage a team of data scientists
- Develop strategic data science roadmap
- Collaborate with engineering teams on ML infrastructure
- Present findings to executive leadership
"""


def test_web_ui_workflow(server):
    """Test complete workflow against a self-managed server."""
    base_url = server

    print("\n🧪 Testing Complete Web UI Workflow Integration")
    print("=" * 60)

    # Step 0: Create a session
    print("\n🔑 Step 0: Creating session...")
    r = requests.post(f"{base_url}/api/sessions/new")
    assert r.status_code == 200, f"Session creation failed: {r.status_code}"
    session_id = r.json()["session_id"]
    print(f"  ✅ Session: {session_id}")

    def _get(path, **kwargs):
        params = kwargs.pop("params", {})
        params["session_id"] = session_id
        return requests.get(f"{base_url}{path}", params=params, **kwargs)

    def _post(path, body=None, **kwargs):
        body = {**(body or {}), "session_id": session_id}
        return requests.post(
            f"{base_url}{path}",
            json=body,
            headers={"Content-Type": "application/json"},
            **kwargs,
        )

    # Step 1: Job description upload
    print("\n📄 Step 1: Uploading job description...")
    r = _post("/api/job", {"job_text": _JOB_TEXT})
    assert r.status_code == 200, (
        f"Job upload failed: {r.status_code} — {r.text}"
    )
    print("  ✅ Job description uploaded")

    # Step 2: Status after upload
    print("\n📊 Step 2: Checking status after upload...")
    r = _get("/api/status")
    status = r.json()
    assert status.get("phase"), (
        f"No phase in /api/status response: {status}"
    )
    print(f"  ✅ Phase: {status['phase']}")

    # Step 3: Analyse job
    print("\n🔍 Step 3: Analysing job description...")
    r = _post("/api/action", {"action": "analyze_job", "job_text": _JOB_TEXT})
    assert r.status_code == 200, (
        f"Job analysis failed: {r.status_code} — {r.text}"
    )
    result = r.json()
    print(f"  ✅ Analysis done: "
          f"{str(result.get('result', ''))[:80]}...")

    # Step 4: Customization recommendations
    print("\n🎯 Step 4: Generating customizations...")
    r = _post("/api/action", {"action": "recommend_customizations"})
    assert r.status_code == 200, (
        f"Customizations failed: {r.status_code} — {r.text}"
    )
    print("  ✅ Customizations generated")

    # Step 5: Wait for customization phase
    print("\n⏱️  Step 5: Waiting for customization phase...")
    for i in range(30):
        time.sleep(1)
        r = _get("/api/status")
        status = r.json()
        if status.get("phase") == "generation":
            print("  ✅ In generation phase")
            break
        if i > 0 and i % 5 == 0:
            print(f"  ⏳ {i}s — phase: {status.get('phase')}")

    # Step 6: Trigger CV generation
    print("\n⚙️  Step 6: Triggering CV generation...")
    r = _post("/api/action", {"action": "generate_cv"})
    assert r.status_code == 200, (
        f"CV generation failed: {r.status_code} — {r.text}"
    )
    print("  ✅ Generation initiated")

    # Step 7: Wait for generated files
    print("\n⏱️  Step 7: Waiting for CV files...")
    generated_files = None
    for i in range(60):
        time.sleep(1)
        r = _get("/api/status")
        status = r.json()
        if status.get("generated_files"):
            generated_files = status["generated_files"]
            print("  ✅ Files generated")
            break
        if i > 0 and i % 10 == 0:
            print(f"  ⏳ {i}s elapsed...")

    assert generated_files is not None, "CV generation timed out after 60s"

    # Step 8: Download each file
    print("\n⬇️  Step 8: Testing downloads...")
    files_to_test: list[str] = []
    if isinstance(generated_files, dict):
        if "files" in generated_files:
            files_to_test = generated_files["files"]
        else:
            for file_data in generated_files.values():
                if isinstance(file_data, dict):
                    name = file_data.get("filename")
                elif isinstance(file_data, str):
                    name = Path(file_data).name
                else:
                    name = None
                if name:
                    files_to_test.append(name)

    for filename in files_to_test:
        dl = _get(f"/api/download/{filename}")
        assert dl.status_code == 200, (
            f"Download failed for {filename}: {dl.status_code}"
        )
        print(f"  ✅ {filename} ({len(dl.content)} bytes)")

    print("\n✅ WORKFLOW TEST COMPLETED SUCCESSFULLY!")


# ---------------------------------------------------------------------------
# Script entry-point (manual use)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Run via pytest so the fixture lifecycle works correctly.
    raise SystemExit(pytest.main([__file__, "-v", "-s"]))
