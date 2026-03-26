# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Browser restore coverage for canonical workflow and staged states."""

import json

from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import (
    API_GENERATION_STATE_CONFIRMED,
    API_GENERATION_STATE_FINAL_COMPLETE,
    API_GENERATION_STATE_IDLE,
    API_GENERATION_STATE_LAYOUT_REVIEW,
    API_STATUS_FINALISE,
    API_STATUS_GENERATE,
    API_STATUS_IN_ANALYSIS,
    API_STATUS_LAYOUT_REVIEW,
    API_STATUS_REWRITE,
    API_STATUS_SPELL,
)


def _json_route(route, body, status=200):
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(body),
    )


def _install_restore_routes(
    page: Page,
    *,
    status_response: dict,
    generation_state_response: dict,
    layout_html_response: dict | None = None,
    layout_html_status: int = 200,
    generate_preview_response: dict | None = None,
    generate_preview_status: int = 200,
) -> None:
    history_response = {
        "history": [],
        "phase": status_response.get("phase", "init"),
    }
    page.route(
        "**/api/status**",
        lambda route: _json_route(route, status_response),
    )
    page.route(
        "**/api/history**",
        lambda route: _json_route(route, history_response),
    )
    page.route(
        "**/api/cv/generation-state**",
        lambda route: _json_route(route, generation_state_response),
    )
    page.route(
        "**/api/layout-html**",
        lambda route: _json_route(
            route,
            layout_html_response
            if layout_html_response is not None
            else {
                "ok": True,
                "html": (
                    "<html><body><h1>Stored Layout Preview</h1>"
                    "</body></html>"
                ),
            },
            status=layout_html_status,
        ),
    )
    page.route(
        "**/api/cv/generate-preview**",
        lambda route: _json_route(
            route,
            generate_preview_response
            if generate_preview_response is not None
            else {
                "ok": True,
                "html": (
                    "<html><body><h1>Generated Layout Preview</h1>"
                    "</body></html>"
                ),
            },
            status=generate_preview_status,
        ),
    )


def _reload_and_capture(page: Page, expected_tab_id: str) -> dict:
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_function(
        f"""
        () => {{
            const el = document.getElementById({json.dumps(expected_tab_id)});
            return !!el && el.getAttribute('aria-selected') === 'true';
        }}
        """
    )
    return page.evaluate(
        """
        () => ({
            phase: stateManager.getPhase(),
            stage: stateManager.getCurrentStage(),
            tab: stateManager.getCurrentTab(),
            generationState: stateManager.getGenerationState(),
        })
        """
    )


class TestBrowserRestore:
    def test_reload_into_job_analysis_selects_analysis_tab(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_IN_ANALYSIS,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-analysis")

        assert restored["phase"] == "job_analysis"
        assert restored["stage"] == "analysis"
        assert restored["tab"] == "analysis"
        expect(page.locator("#tab-analysis")).to_be_visible()

    def test_reload_into_rewrite_review_selects_rewrite_tab(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_REWRITE,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-rewrite")

        assert restored["phase"] == "rewrite_review"
        assert restored["stage"] == "rewrite"
        assert restored["tab"] == "rewrite"
        expect(page.locator("#tab-rewrite")).to_be_visible()

    def test_reload_into_spell_check_selects_spell_tab(self, page: Page):
        _install_restore_routes(
            page,
            status_response=API_STATUS_SPELL,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-spell")

        assert restored["phase"] == "spell_check"
        assert restored["stage"] == "spell"
        assert restored["tab"] == "spell"
        expect(page.locator("#tab-spell")).to_be_visible()

    def test_reload_into_generation_idle_selects_generate_tab(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_GENERATE,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-generate")

        assert restored["phase"] == "generation"
        assert restored["stage"] == "generate"
        assert restored["tab"] == "generate"
        assert restored["generationState"]["phase"] == "idle"

    def test_reload_into_layout_review_idle_selects_layout_tab(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_LAYOUT_REVIEW,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-layout")

        assert restored["phase"] == "layout_review"
        assert restored["stage"] == "layout"
        assert restored["tab"] == "layout"
        assert restored["generationState"]["phase"] == "idle"
        assert restored["generationState"]["previewAvailable"] is False

    def test_reload_into_layout_review_idle_recovers_when_stored_html_missing(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_LAYOUT_REVIEW,
            generation_state_response=API_GENERATION_STATE_IDLE,
            layout_html_response={
                "error": "No HTML file found in output directory.",
            },
            layout_html_status=404,
        )
        page.route(
            "**/api/cv/generate-preview**",
            lambda route: _json_route(
                route,
                {
                    "ok": True,
                    "html": (
                        "<html><body><h1>Recovered Layout Preview</h1>"
                        "</body></html>"
                    ),
                },
            ),
        )

        restored = _reload_and_capture(page, "tab-layout")

        page.wait_for_function(
            """
            () => {
                const iframe = document.getElementById('layout-preview');
                const text = iframe?.contentDocument?.body?.textContent || '';
                return text.includes('Recovered Layout Preview');
            }
            """
        )
        assert restored["phase"] == "layout_review"
        assert restored["stage"] == "layout"
        assert restored["tab"] == "layout"
        assert restored["generationState"]["phase"] == "layout_review"
        assert restored["generationState"]["previewAvailable"] is True

    def test_reload_into_layout_review_active_restores_preview_state(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_LAYOUT_REVIEW,
            generation_state_response=API_GENERATION_STATE_LAYOUT_REVIEW,
            layout_html_response={
                "ok": True,
                "html": (
                    "<html><body><h1>Stale Disk Preview</h1>"
                    "</body></html>"
                ),
            },
            generate_preview_response={
                "ok": True,
                "html": (
                    "<html><body><h1>Generated Active Preview</h1>"
                    "</body></html>"
                ),
            },
        )

        restored = _reload_and_capture(page, "tab-layout")

        page.wait_for_function(
            """
            () => {
                const iframe = document.getElementById('layout-preview');
                const text = iframe?.contentDocument?.body?.textContent || '';
                return text.includes('Generated Active Preview');
            }
            """
        )

        assert restored["phase"] == "layout_review"
        assert restored["stage"] == "layout"
        assert restored["tab"] == "layout"
        assert restored["generationState"]["phase"] == "layout_review"
        assert restored["generationState"]["previewAvailable"] is True

    def test_reload_into_layout_review_confirmed_restores_confirmed_state(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_LAYOUT_REVIEW,
            generation_state_response=API_GENERATION_STATE_CONFIRMED,
        )

        restored = _reload_and_capture(page, "tab-layout")

        assert restored["phase"] == "layout_review"
        assert restored["stage"] == "layout"
        assert restored["tab"] == "layout"
        assert restored["generationState"]["phase"] == "confirmed"
        assert restored["generationState"]["layoutConfirmed"] is True

    def test_reload_into_refinement_final_complete_selects_finalise_tab(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_FINALISE,
            generation_state_response=API_GENERATION_STATE_FINAL_COMPLETE,
        )

        restored = _reload_and_capture(page, "tab-finalise")

        assert restored["phase"] == "refinement"
        assert restored["stage"] == "finalise"
        assert restored["tab"] == "finalise"
        assert restored["generationState"]["phase"] == "final_complete"

    def test_reload_into_refinement_legacy_idle_keeps_finalise_access(
        self,
        page: Page,
    ):
        _install_restore_routes(
            page,
            status_response=API_STATUS_FINALISE,
            generation_state_response=API_GENERATION_STATE_IDLE,
        )

        restored = _reload_and_capture(page, "tab-finalise")

        assert restored["phase"] == "refinement"
        assert restored["stage"] == "finalise"
        assert restored["tab"] == "finalise"
        assert restored["generationState"]["phase"] == "idle"
        expect(page.locator("#tab-download")).to_be_visible()
