"""
Shared pytest fixtures for the cv-builder test suite.
"""

import pytest
import requests


def _server_is_up(base_url: str = "http://localhost:5001") -> bool:
    """Return True if the web server is reachable."""
    try:
        requests.get(f"{base_url}/api/status", timeout=2)
        return True
    except (requests.ConnectionError, requests.Timeout):
        return False


@pytest.fixture(autouse=False, scope="session")
def require_server():
    """Skip the test if the local web server is not running on port 5001.

    Apply to integration tests that talk to the running Flask app::

        def test_something(require_server):
            ...
    """
    if not _server_is_up():
        pytest.skip(
            "Web server not available at http://localhost:5001 — "
            "start it with: conda activate cvgen && python scripts/web_app.py --port 5001"
        )
