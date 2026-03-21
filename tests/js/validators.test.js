// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/validators.test.js
 * Unit tests for web/validators.js
 */
import {
  parseStatusResponse,
  parseSessionListResponse,
  parseRewritesResponse,
  parseMessageResponse,
} from '../../web/validators.js'

// ── parseStatusResponse ───────────────────────────────────────────────────

describe('parseStatusResponse', () => {
  const minimal = () => ({
    phase: 'init', llm_provider: 'copilot', job_description: '',
    post_analysis_questions: [], post_analysis_answers: {},
    all_experience_ids: [], all_experiences: [], all_skills: [], all_achievements: [],
    professional_summaries: [], copilot_auth: false, iterating: false,
    experience_decisions: {}, skill_decisions: {},
    achievement_decisions: {}, publication_decisions: {},
    extra_skills: [], extra_skill_matches: {}, session_file: 'session.json',
  })

  it('returns the data object unchanged', () => {
    const data = minimal()
    expect(parseStatusResponse(data)).toBe(data)
  })

  it('warns on missing required fields', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStatusResponse({})
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[parseStatusResponse] Missing fields:'), expect.any(Array), expect.any(Object))
    spy.mockRestore()
  })

  it('does not warn when all required fields are present', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStatusResponse(minimal())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when post_analysis_questions is not an array', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStatusResponse({ ...minimal(), post_analysis_questions: 'bad' })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('post_analysis_questions should be an array'), 'bad')
    spy.mockRestore()
  })

  it('warns when all_experience_ids is not an array', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStatusResponse({ ...minimal(), all_experience_ids: {} })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('all_experience_ids should be an array'), {})
    spy.mockRestore()
  })
})

// ── parseSessionListResponse ──────────────────────────────────────────────

describe('parseSessionListResponse', () => {
  it('returns the data object unchanged', () => {
    const data = { sessions: [] }
    expect(parseSessionListResponse(data)).toBe(data)
  })

  it('warns when sessions is not an array', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseSessionListResponse({ sessions: null })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('sessions should be an array'), expect.any(Object))
    spy.mockRestore()
  })

  it('warns on session items missing required fields', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseSessionListResponse({ sessions: [{ path: 'x.json' }] })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('missing fields:'), expect.any(Array), expect.any(Object))
    spy.mockRestore()
  })

  it('does not warn for fully-populated session items', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const session = {
      path: 'x.json', position_name: 'Dev', timestamp: 0,
      phase: 'init', has_job: true, has_analysis: false, has_customizations: false,
    }
    parseSessionListResponse({ sessions: [session] })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── parseRewritesResponse ─────────────────────────────────────────────────

describe('parseRewritesResponse', () => {
  it('returns the data object unchanged', () => {
    const data = { ok: true, rewrites: [], persuasion_warnings: [], phase: 'rewrite_review' }
    expect(parseRewritesResponse(data)).toBe(data)
  })

  it('warns on missing required fields', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseRewritesResponse({})
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when rewrites is not an array', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseRewritesResponse({ ok: true, rewrites: 'bad', persuasion_warnings: [], phase: 'rewrite_review' })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('rewrites should be an array'), 'bad')
    spy.mockRestore()
  })

  it('does not warn for a valid response', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseRewritesResponse({ ok: true, rewrites: [], persuasion_warnings: [], phase: 'rewrite_review' })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── parseMessageResponse ──────────────────────────────────────────────────

describe('parseMessageResponse', () => {
  it('returns the data object unchanged', () => {
    const data = { ok: true }
    expect(parseMessageResponse(data)).toBe(data)
  })

  it('warns when neither ok nor error is present', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseMessageResponse({})
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('neither ok nor error'), {})
    spy.mockRestore()
  })

  it('does not warn when ok is present', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseMessageResponse({ ok: true })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not warn when error is present', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseMessageResponse({ error: 'something went wrong' })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
