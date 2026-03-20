"""
UI tests — Step 1: Job Input

Covers:
- Page loads and shows the Job Input step as active
- Text paste path: entering text triggers analysis on submit
- URL fetch path: URL input triggers /api/fetch-job-url
- File upload path: uploading a .txt file populates the job description
- Empty submit shows validation error (alert modal)
"""

import os
import json
from playwright.sync_api import Page, expect


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
SAMPLE_JOB_PATH = os.path.join(FIXTURES_DIR, "sample_job.txt")

_PASTE_JOB = (
    "Senior Data Scientist at Acme Corp\n\n"
    "We are looking for an experienced Senior Data Scientist to join our AI research team. "
    "You will design and deploy machine learning models, conduct statistical analyses, and "
    "collaborate with product and engineering teams to deliver data-driven insights.\n\n"
    "Requirements:\n- Python\n- Machine Learning\n- SQL\n- 5+ years experience"
)


class TestPageLoad:
    def test_title(self, job_stage_page: Page):
        """Default title is shown when no job has been loaded."""
        expect(job_stage_page).to_have_title("CV Generator — Professional Web UI")

    def test_job_input_step_exists(self, page: Page):
        expect(page.locator("#step-job")).to_be_visible()

    def test_analyze_button_present(self, page: Page):
        """#analyze-btn exists in DOM (visible only in job stage)."""
        assert page.locator("#analyze-btn").count() >= 1

    def test_recommend_button_present(self, page: Page):
        """#recommend-btn exists in DOM (visible only in analysis stage)."""
        assert page.locator("#recommend-btn").count() >= 1

    def test_generate_button_present(self, page: Page):
        """#generate-btn is visible in customization stage (page fixture)."""
        expect(page.locator("#generate-btn")).to_be_visible()

    def test_reset_button_present(self, page: Page):
        expect(page.locator("#reset-btn")).to_be_visible()

    def test_job_tab_active_on_load(self, job_stage_page: Page):
        """#tab-job is visible when the app is in the job/init stage."""
        expect(job_stage_page.locator("#tab-job")).to_be_visible()

    def test_workflow_steps_all_visible(self, page: Page):
        for step_id in [
            "step-job", "step-analysis", "step-customizations",
            "step-rewrite", "step-spell", "step-generate",
            "step-finalise",
        ]:
            expect(page.locator(f"#{step_id}")).to_be_visible()

    def test_conversation_panel_present(self, page: Page):
        expect(page.locator("#conversation")).to_be_visible()

    def test_message_input_present(self, page: Page):
        expect(page.locator("#message-input")).to_be_visible()


def _navigate_to_job_input_panel(page: Page, input_method: str = "paste") -> None:
    """Navigate to the job input panel, dismissing any loaded-job view.

    Uses job_stage_page (init phase) so #tab-job is visible and
    the load panel is shown directly without needing to dismiss a
    "Load Different Job" button.

    Args:
        page: Playwright page (should be a job_stage_page).
        input_method: "paste" | "url" | "file" — which input-method tab.
    """
    page.locator("#tab-job").click()
    load_btn = page.locator("button:has-text('Load Different Job')")
    try:
        load_btn.wait_for(state="visible", timeout=3_000)
        load_btn.click()
    except Exception:
        pass  # No loaded job — input panel already showing

    # "Paste Text" is active by default; only click alternate tab when needed.
    if input_method == "url":
        url_tab = page.locator("button.input-tab", has_text="From URL")
        url_tab.wait_for(state="visible", timeout=5_000)
        url_tab.click()
    elif input_method == "file":
        file_tab = page.locator("button.input-tab", has_text="Upload File")
        file_tab.wait_for(state="visible", timeout=5_000)
        file_tab.click()
    else:
        paste_tab = page.locator("button.input-tab", has_text="Paste Text")
        paste_tab.wait_for(state="visible", timeout=5_000)


class TestTextPasteInput:
    def test_job_tab_shows_content_area(self, job_stage_page: Page):
        """Clicking Job Description tab shows the document content area."""
        job_stage_page.locator("#tab-job").click()
        expect(job_stage_page.locator("#document-content")).to_be_visible()

    def test_submit_empty_shows_error(self, job_stage_page: Page):
        """Clicking Analyze with no job loaded shows error feedback."""
        job_stage_page.locator("#tab-job").click()
        job_stage_page.locator("#analyze-btn").click()
        alert_visible = job_stage_page.locator(
            "#alert-modal-overlay"
        ).is_visible()
        conv_text = job_stage_page.locator(
            "#conversation"
        ).inner_text().lower()
        has_feedback = (
            alert_visible
            or "error" in conv_text
            or "job" in conv_text
        )
        assert has_feedback, \
            "Expected error feedback when no job description provided"

    def test_text_paste_submit_calls_api_job(self, job_stage_page: Page):
        """Submitting text via the paste path POSTs to /api/job."""
        api_calls = []

        def capture(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "ok": True,
                    "position_name": "Test Job",
                    "phase": "job_analysis",
                }),
            )

        job_stage_page.route("**/api/job**", capture)
        _navigate_to_job_input_panel(job_stage_page, "paste")

        textarea = job_stage_page.locator("#job-text-input")
        textarea.wait_for(state="visible", timeout=5_000)
        textarea.fill(_PASTE_JOB)

        submit = job_stage_page.locator(
            "button:has-text('Submit Job Description')"
        )
        submit.wait_for(state="visible", timeout=5_000)
        submit.click()
        job_stage_page.wait_for_timeout(500)
        assert any("/api/job" in url for url in api_calls), \
            "/api/job was not called after text submission"

    def test_submission_adds_conversation_message(self, job_stage_page: Page):
        """Submitting a job adds a message to the conversation panel."""
        _navigate_to_job_input_panel(job_stage_page, "paste")

        textarea = job_stage_page.locator("#job-text-input")
        textarea.wait_for(state="visible", timeout=5_000)
        textarea.fill(_PASTE_JOB)

        submit = job_stage_page.locator(
            "button:has-text('Submit Job Description')"
        )
        submit.wait_for(state="visible", timeout=5_000)
        submit.click()
        job_stage_page.wait_for_timeout(800)
        conv_text = job_stage_page.locator("#conversation").inner_text()
        assert len(conv_text.strip()) > 0, \
            "Conversation panel should have content after submission"


class TestURLInput:
    def test_url_input_field_present_in_job_tab(self, job_stage_page: Page):
        """URL input is available after switching to the URL input tab."""
        _navigate_to_job_input_panel(job_stage_page, "url")
        url_input = job_stage_page.locator("#job-url-input")
        url_input.wait_for(state="visible", timeout=5_000)
        expect(url_input).to_be_visible()

    def test_fetch_url_calls_api(self, job_stage_page: Page):
        """Entering a URL and clicking Fetch calls /api/fetch-job-url."""
        api_calls = []

        def capture(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True, "job_text": "Job from URL"}),
            )

        job_stage_page.route("**/api/fetch-job-url**", capture)
        _navigate_to_job_input_panel(job_stage_page, "url")

        url_input = job_stage_page.locator("#job-url-input")
        url_input.wait_for(state="visible", timeout=5_000)
        url_input.fill("https://example.com/job/123")

        fetch_btn = job_stage_page.locator(
            "button:has-text('Fetch Job Description')"
        )
        fetch_btn.wait_for(state="visible", timeout=5_000)
        fetch_btn.click()
        job_stage_page.wait_for_timeout(500)
        assert any("/api/fetch-job-url" in url for url in api_calls), \
            "/api/fetch-job-url was not called"


class TestFileUpload:
    def _activate_file_upload_tab(self, page: Page) -> None:
        """Navigate to the Upload File input-method panel."""
        _navigate_to_job_input_panel(page, "file")

    def test_file_upload_input_present(self, job_stage_page: Page):
        """File input element exists after activating the Upload File tab."""
        self._activate_file_upload_tab(job_stage_page)
        file_input = job_stage_page.locator("#job-file-input")
        assert file_input.count() > 0, "File input #job-file-input not found"

    def test_file_upload_populates_job(self, job_stage_page: Page):
        """Uploading a .txt file triggers /api/upload-file or /api/job."""
        api_calls = []

        def capture_upload(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True, "job_text": "Uploaded text"}),
            )

        job_stage_page.route("**/api/upload-file**", capture_upload)
        job_stage_page.route("**/api/job**", capture_upload)
        self._activate_file_upload_tab(job_stage_page)

        file_input = job_stage_page.locator("#job-file-input")
        assert file_input.count() > 0, "File input #job-file-input not found"
        file_input.first.set_input_files(SAMPLE_JOB_PATH)
        use_btn = job_stage_page.locator("#file-upload-btn")
        use_btn.wait_for(state="visible", timeout=3_000)
        use_btn.click()
        job_stage_page.wait_for_timeout(800)
        assert len(api_calls) > 0, "No API call triggered after file upload"
