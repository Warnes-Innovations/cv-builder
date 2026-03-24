// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/skills-review.test.js
 * Unit tests for web/skills-review.js — row-reorder, response handler,
 * and submit decisions.
 * (buildSkillsReviewTable / _renderSkillsTable require jQuery/DataTables
 *  and are covered by integration tests.)
 */
import {
  _parseYearFromStr,
  _computeYearsFromIds,
  saveSkillGroupOverride,
  saveSkillCategoryOverride,
  renameSkillCategory,
  saveSkillCategoryOrder,
  saveSkillQualifierOverride,
  _renderSkillsTable,
  moveSkillRow,
  handleSkillsResponse,
  submitSkillDecisions,
} from '../../web/skills-review.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

function createLocalStorageMock() {
  let store = {}
  return {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: key => { delete store[key] },
    clear: () => { store = {} },
  }
}

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock())
  window.pendingRecommendations = null
  window._skillsOrdered = null
  window._savedDecisions = null
  window._newSkillsFromLLM = []
  window._allExperiences = []
  window.userSelections = { experiences: {}, skills: {} }
  window.waitingForSkillsResponse = false
  initializeState()
  stateManager.setTabData('analysis', null)

  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('updateInclusionCounts', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('escapeHtml', value => String(value))
  vi.stubGlobal('finishInteractiveReview', vi.fn())
  vi.stubGlobal('getSkillRecommendation', vi.fn(() => 'Include'))
  vi.stubGlobal('getSkillConfidence', vi.fn(() => ({ level: 'medium', text: 'Medium' })))
  vi.stubGlobal('getSkillReasoning', vi.fn(() => 'Relevant to the role'))
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
  delete window._allExperiences
  delete window.userSelections
  delete window.waitingForSkillsResponse
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

  it('includes editable extra_skill_matches in request payload for accepted new skills', async () => {
    document.body.innerHTML = `
      <input class="skill-match-input" data-skill="NewSkill" value="exp_1, exp_2" />
    `
    window._newSkillsFromLLM = ['NewSkill']
    window._allExperiences = [{ id: 'exp_1' }, { id: 'exp_2' }, { id: 'exp_3' }]
    window.userSelections.skills = { NewSkill: 'include' }

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSkillDecisions()

    const call = globalThis.fetch.mock.calls[0]
    const payload = JSON.parse(call[1].body)
    expect(payload.extra_skill_matches).toEqual({ NewSkill: ['exp_1', 'exp_2'] })
    expect(window._savedDecisions.extra_skill_matches).toEqual({ NewSkill: ['exp_1', 'exp_2'] })
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

describe('saveSkillGroupOverride', () => {
  beforeEach(() => {
    window._skillsOrdered = [{ name: 'Python', group: '' }]
  })

  it('posts group edits to /api/review-skill-group', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillGroupOverride('Python', 'scripting')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-skill-group', expect.objectContaining({ method: 'POST' }))
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({ skill: 'Python', group: 'scripting' })
    expect(window._skillsOrdered[0].group).toBe('scripting')
  })

  it('normalizes blank group names to null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillGroupOverride('Python', '   ')
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({ skill: 'Python', group: null })
    expect(window._skillsOrdered[0].group).toBe('')
  })

  it('throws a helpful error when the API fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Nope' }),
    })
    await expect(saveSkillGroupOverride('Python', 'scripting')).rejects.toThrow('Nope')
  })
})

describe('saveSkillCategoryOverride', () => {
  beforeEach(() => {
    window._skillsOrdered = [{ name: 'Python', category: 'Programming' }]
  })

  it('posts category edits to /api/review-skill-category', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillCategoryOverride('Python', 'Data Science')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-skill-category', expect.objectContaining({ method: 'POST' }))
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({ skill: 'Python', category: 'Data Science' })
    expect(window._skillsOrdered[0].category).toBe('Data Science')
  })

  it('normalizes blank category names to null and removes local override', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillCategoryOverride('Python', '   ')
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({ skill: 'Python', category: null })
    expect('category' in window._skillsOrdered[0]).toBe(false)
  })

  it('throws a helpful error when the API fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Nope' }),
    })
    await expect(saveSkillCategoryOverride('Python', 'Data Science')).rejects.toThrow('Nope')
  })
})

describe('skill category manager helpers', () => {
  it('posts category renames to /api/review-skill-categories', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await renameSkillCategory('Programming', 'Data Science')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-skill-categories', expect.objectContaining({ method: 'POST' }))
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      action: 'rename',
      old_category: 'Programming',
      new_category: 'Data Science',
    })
  })

  it('posts category ordering to /api/review-skill-categories', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillCategoryOrder(['Data Science', 'Programming', 'Programming'])
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      action: 'reorder',
      ordered_categories: ['Data Science', 'Programming'],
    })
  })

  it('renders a category manager and persists reorder clicks', async () => {
    document.body.innerHTML = '<div id="skills-table-container"></div>'
    window.pendingRecommendations = { recommended_skills: [] }
    window._skillsOrdered = [
      { name: 'Python', category: 'Programming' },
      { name: 'SQL', category: 'Data Science' },
    ]
    stateManager.setTabData('analysis', { required_skills: [], nice_to_have_skills: [] })

    const dataTableMock = vi.fn().mockReturnValue({ destroy: vi.fn() })
    globalThis.$ = vi.fn(() => ({ DataTable: dataTableMock }))
    globalThis.$.fn = { DataTable: { isDataTable: vi.fn().mockReturnValue(false) } }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    _renderSkillsTable(document.getElementById('skills-table-container'), new Set(), window.pendingRecommendations, new Set(), new Set())

    const manager = document.querySelector('.skill-category-manager')
    expect(manager).not.toBeNull()

    const moveDown = manager.querySelector('[data-action="category-down"][data-category="Programming"]')
    moveDown.click()

    await Promise.resolve()
    await Promise.resolve()

    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      action: 'reorder',
      ordered_categories: ['Data Science', 'Programming'],
    })
  })

  it('renders a category manager and persists rename changes', async () => {
    document.body.innerHTML = '<div id="skills-table-container"></div>'
    window.pendingRecommendations = { recommended_skills: [] }
    window._skillsOrdered = [
      { name: 'Python', category: 'Programming' },
      { name: 'SQL', category: 'Programming' },
    ]
    stateManager.setTabData('analysis', { required_skills: [], nice_to_have_skills: [] })

    const dataTableMock = vi.fn().mockReturnValue({ destroy: vi.fn() })
    globalThis.$ = vi.fn(() => ({ DataTable: dataTableMock }))
    globalThis.$.fn = { DataTable: { isDataTable: vi.fn().mockReturnValue(false) } }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    _renderSkillsTable(document.getElementById('skills-table-container'), new Set(), window.pendingRecommendations, new Set(), new Set())

    const input = document.querySelector('.skill-category-manager-input')
    input.value = 'Applied AI'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await Promise.resolve()
    await Promise.resolve()

    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      action: 'rename',
      old_category: 'Programming',
      new_category: 'Applied AI',
    })
    expect(window._skillsOrdered.every(skill => skill.category === 'Applied AI')).toBe(true)
  })
})

describe('saveSkillQualifierOverride', () => {
  beforeEach(() => {
    window._skillsOrdered = [{ name: 'Python' }]
  })

  it('posts qualifier edits to /api/review-skill-qualifiers', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillQualifierOverride('Python', {
      proficiency: 'expert',
      subskills: 'Pandas, NumPy, Pandas',
      parenthetical: 'Expert, Pandas, NumPy',
    })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-skill-qualifiers', expect.objectContaining({ method: 'POST' }))
    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      skill: 'Python',
      proficiency: 'expert',
      subskills: ['Pandas', 'NumPy'],
      parenthetical: 'Expert, Pandas, NumPy',
    })
    expect(window._skillsOrdered[0]).toMatchObject({
      proficiency: 'expert',
      subskills: ['Pandas', 'NumPy'],
      parenthetical: 'Expert, Pandas, NumPy',
    })
  })

  it('removes blank qualifier fields from the local skill object', async () => {
    window._skillsOrdered = [{
      name: 'Python',
      proficiency: 'expert',
      subskills: ['Pandas'],
      parenthetical: 'Expert, Pandas',
    }]
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSkillQualifierOverride('Python', {
      proficiency: ' ',
      subskills: ' ',
      parenthetical: ' ',
    })
    expect(window._skillsOrdered[0]).toEqual({ name: 'Python' })
  })
})

describe('_renderSkillsTable qualifier inputs', () => {
  it('posts row-level qualifier edits from rendered controls', async () => {
    document.body.innerHTML = '<div id="skills-table-container"></div>'
    window.pendingRecommendations = { recommended_skills: [] }
    window._skillsOrdered = [
      {
        name: 'Python',
        category: 'Programming',
      },
    ]
    stateManager.setTabData('analysis', { required_skills: [], nice_to_have_skills: [] })

    const dataTableMock = vi.fn().mockReturnValue({ destroy: vi.fn() })
    globalThis.$ = vi.fn(() => ({ DataTable: dataTableMock }))
    globalThis.$.fn = { DataTable: { isDataTable: vi.fn().mockReturnValue(false) } }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    _renderSkillsTable(document.getElementById('skills-table-container'), new Set(), window.pendingRecommendations, new Set(), new Set())

    document.querySelector('.skill-proficiency-input').value = 'expert'
    document.querySelector('.skill-subskills-input').value = 'Pandas, NumPy'
    const parentheticalInput = document.querySelector('.skill-parenthetical-input')
    parentheticalInput.value = 'Expert, Pandas, NumPy'
    parentheticalInput.dispatchEvent(new Event('change', { bubbles: true }))

    await Promise.resolve()
    await Promise.resolve()

    const payload = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(payload).toEqual({
      skill: 'Python',
      proficiency: 'expert',
      subskills: ['Pandas', 'NumPy'],
      parenthetical: 'Expert, Pandas, NumPy',
    })
  })
})

// ── _parseYearFromStr ─────────────────────────────────────────────────────────

describe('_parseYearFromStr', () => {
  it('returns current year for "current"', () => {
    expect(_parseYearFromStr('current')).toBe(new Date().getFullYear())
  })

  it('returns current year for "present"', () => {
    expect(_parseYearFromStr('Present')).toBe(new Date().getFullYear())
  })

  it('returns current year for "now"', () => {
    expect(_parseYearFromStr('now')).toBe(new Date().getFullYear())
  })

  it('parses a 4-digit year', () => {
    expect(_parseYearFromStr('2019')).toBe(2019)
  })

  it('parses year embedded in a date string', () => {
    expect(_parseYearFromStr('Jan 2021')).toBe(2021)
  })

  it('returns null for empty string', () => {
    expect(_parseYearFromStr('')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(_parseYearFromStr(null)).toBeNull()
  })

  it('returns null for a non-year string', () => {
    expect(_parseYearFromStr('sometime')).toBeNull()
  })
})

// ── _computeYearsFromIds ──────────────────────────────────────────────────────

describe('_computeYearsFromIds', () => {
  it('returns null for empty ids array', () => {
    expect(_computeYearsFromIds([], [])).toBeNull()
  })

  it('returns null for null ids', () => {
    expect(_computeYearsFromIds(null, [])).toBeNull()
  })

  it('returns null when no ids match', () => {
    const exps = [{ id: 'exp_1', start_date: '2018', end_date: '2020' }]
    expect(_computeYearsFromIds(['exp_99'], exps)).toBeNull()
  })

  it('sums duration of a single matched experience', () => {
    const exps = [{ id: 'exp_1', start_date: '2018', end_date: '2020' }]
    // 2020 - 2018 + 1 = 3
    expect(_computeYearsFromIds(['exp_1'], exps)).toBe(3)
  })

  it('sums duration of multiple matched experiences', () => {
    const exps = [
      { id: 'exp_1', start_date: '2016', end_date: '2018' },  // 3 years
      { id: 'exp_2', start_date: '2019', end_date: '2021' },  // 3 years
    ]
    expect(_computeYearsFromIds(['exp_1', 'exp_2'], exps)).toBe(6)
  })

  it('treats open-ended (present/current) end as current year', () => {
    const currentYear = new Date().getFullYear()
    const exps = [{ id: 'exp_1', start_date: '2020', end_date: 'present' }]
    const expected = currentYear - 2020 + 1
    expect(_computeYearsFromIds(['exp_1'], exps)).toBe(expected)
  })

  it('uses at least 1 year when start is unparseable', () => {
    const exps = [{ id: 'exp_1', start_date: 'unknown', end_date: '2022' }]
    expect(_computeYearsFromIds(['exp_1'], exps)).toBe(1)
  })

  it('only counts experiences whose id is in the provided list', () => {
    const exps = [
      { id: 'exp_1', start_date: '2015', end_date: '2017' },
      { id: 'exp_2', start_date: '2018', end_date: '2020' },
    ]
    expect(_computeYearsFromIds(['exp_1'], exps)).toBe(3)
  })
})
