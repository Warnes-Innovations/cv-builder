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
        # Remove existing overlay and install a MutationObserver to remove any
        # future onboarding overlay that may be inserted after page load.
        page.evaluate("() => { const remove = () => { const el = document.getElementById('onboarding-modal-overlay'); if (el) el.remove(); }; remove(); const mo = new MutationObserver(remove); mo.observe(document.documentElement, { childList: true, subtree: true }); }")
    except Exception:
        pass
    yield
