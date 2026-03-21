/**
 * tests/js/skills-review.test.js
 * Unit tests for web/skills-review.js — row-reorder, response handler,
 * and submit decisions.
 * (buildSkillsReviewTable / _renderSkillsTable require jQuery/DataTables
 *  and are covered by integration tests.)
 */
import {
  moveSkillRow,
  handleSkillsResponse,
  submitSkillDecisions,
} from '../../web/skills-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window.pendingRecommendations = null
  window._skillsOrdered = null
  window._savedDecisions = null
  window._newSkillsFromLLM = []
  window.userSelections = { experiences: {}, skills: {} }
  window.waitingForSkillsResponse = false
  window.tabData = { analysis: null }

  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('updateInclusionCounts', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('finishInteractiveReview', vi.fn())
  vi.stubGlobal('_updatePageEstimate', vi.fn())
  vi.stubGlobal('_renderSkillsTable', vi.fn())
  vi.stubGlobal('handleActionClick', vi.fn())

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.pendingRecommendations
  delete window._skillsOrdered
  delete window._savedDecisions
  delete window._newSkillsFromLLM
  delete window.userSelections
  delete window.waitingForSkillsResponse
  delete window.tabData
})

// ── moveSkillRow ──────────────────────────────────────────────────────────

describe('moveSkillRow', () => {
  beforeEach(() => {
    window._skillsOrdered = ['Python', 'Docker', 'Go']
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it('does nothing when _skillsOrdered is null', () => {
    window._skillsOrdered = null
    expect(() => moveSkillRow('Python', -1)).not.toThrow()
  })

  it('does nothing when skill is not found', () => {
    moveSkillRow('unknown', 1)
    expect(window._skillsOrdered).toEqual(['Python', 'Docker', 'Go'])
  })

  it('does nothing when move would go out of bounds (up from first)', () => {
    moveSkillRow('Python', -1)
    expect(window._skillsOrdered).toEqual(['Python', 'Docker', 'Go'])
  })

  it('does nothing when move would go out of bounds (down from last)', () => {
    moveSkillRow('Go', 1)
    expect(window._skillsOrdered).toEqual(['Python', 'Docker', 'Go'])
  })

  it('moves a skill up', () => {
    moveSkillRow('Docker', -1)
    expect(window._skillsOrdered).toEqual(['Docker', 'Python', 'Go'])
  })

  it('moves a skill down', () => {
    moveSkillRow('Docker', 1)
    expect(window._skillsOrdered).toEqual(['Python', 'Go', 'Docker'])
  })

  it('fires a backend reorder request', () => {
    moveSkillRow('Docker', -1)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/reorder-rows', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('works with object-style skill entries', () => {
    window._skillsOrdered = [
      { name: 'Python', _isNew: false },
      { name: 'Docker', _isNew: false },
    ]
    moveSkillRow('Docker', -1)
    expect(window._skillsOrdered.map(s => s.name)).toEqual(['Docker', 'Python'])
  })
})

// ── handleSkillsResponse ──────────────────────────────────────────────────

describe('handleSkillsResponse', () => {
  it('sets waitingForSkillsResponse to false', async () => {
    window.waitingForSkillsResponse = true
    await handleSkillsResponse('yes')
    expect(window.waitingForSkillsResponse).toBe(false)
  })

  it('sends "use this skills strategy" for "yes"', async () => {
    await handleSkillsResponse('yes')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('skills strategy'))
  })

  it('asks for changes for "no"', async () => {
    await handleSkillsResponse('no')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('changes'))
  })

  it('asks for changes for "modify"', async () => {
    await handleSkillsResponse('please modify this')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('changes'))
  })

  it('sends generic feedback message for other input', async () => {
    await handleSkillsResponse('whatever')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('feedback'))
  })

  it('calls finishInteractiveReview', async () => {
    await handleSkillsResponse('yes')
    expect(globalThis.finishInteractiveReview).toHaveBeenCalled()
  })
})

// ── submitSkillDecisions ──────────────────────────────────────────────────

describe('submitSkillDecisions', () => {
  it('shows alert when no decisions', async () => {
    window.userSelections.skills = {}
    await submitSkillDecisions()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('No Selections', expect.any(String))
  })

  it('saves decisions and switches tab on success', async () => {
    window.userSelections.skills = { Python: 'emphasize', Docker: 'include' }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSkillDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('2 items'))
    expect(globalThis.scheduleAtsRefresh).toHaveBeenCalled()
    expect(globalThis.switchTab).toHaveBeenCalledWith('achievements-review')
  })

  it('stores decisions in _savedDecisions', async () => {
    window.userSelections.skills = { Python: 'emphasize' }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSkillDecisions()
    expect(window._savedDecisions.skill_decisions).toEqual({ Python: 'emphasize' })
  })

  it('includes extra_skills note in toast when LLM skills are accepted', async () => {
    window._newSkillsFromLLM = ['NewSkill']
    window.userSelections.skills = { NewSkill: 'include' }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSkillDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(
      expect.stringContaining('AI-suggested'),
    )
  })

  it('shows error toast when API returns non-ok', async () => {
    window.userSelections.skills = { Python: 'include' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })
    await submitSkillDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Server error'), 'error')
  })

  it('shows error toast on network failure', async () => {
    window.userSelections.skills = { Python: 'include' }
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await submitSkillDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error')
  })
})
