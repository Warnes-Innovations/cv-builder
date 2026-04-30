import pytest
from playwright.sync_api import Page

@pytest.fixture(autouse=True)
def _dismiss_onboarding_modal(page: Page):
    """Autouse fixture to remove blocking onboarding modal in CI/local runs.

    Some test environments show an onboarding modal that intercepts clicks
    (id: onboarding-modal-overlay). Hide it to ensure UI tests can interact
    with the page elements.
    """
    try:
        page.evaluate("() => { const el = document.getElementById('onboarding-modal-overlay'); if (el) el.style.display = 'none'; }")
    except Exception:
        pass
    yield
