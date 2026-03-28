// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/master-cv.test.js
 * Unit tests for web/master-cv.js — Master CV management tab render helpers
 * and CRUD modal handlers.
 */

import {
  _renderPersonalInfoCard,
  _renderExperiencesList,
  _renderSkillsSection,
  _renderEducationList,
  _renderAwardsList,
  _renderMasterAchievementsTable,
  _renderSummariesList,
  loadPublications,
  setPublicationSortMode,
  setPublicationGroupMode,
  importPublicationsBib,
  convertPublicationText,
  importConvertedPublicationText,
  closeMasterAchModal,
  closeMasterSumModal,
  closePersonalInfoModal,
  closeExperienceModal,
  closeSkillModal,
  closeEducationModal,
  closeAwardModal,
  saveMasterAchievement,
  deleteMasterExperience,
  saveMasterSkill,
  deleteMasterSkill,
  deleteMasterSummary,
} from '../../web/master-cv.js'

// ---------------------------------------------------------------------------
// Permanent global stubs (set once at module scope, never removed)
// ---------------------------------------------------------------------------

vi.stubGlobal('CSS', { escape: s => String(s) })

const escapeHtmlImpl = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

vi.stubGlobal('escapeHtml', escapeHtmlImpl)
vi.stubGlobal('restoreFocus', vi.fn())
vi.stubGlobal('setInitialFocus', vi.fn())
vi.stubGlobal('trapFocus', vi.fn())
vi.stubGlobal('_focusedElementBeforeModal', null)

// Mutable stubs — replaced per-describe via beforeEach
let showAlertModalMock = vi.fn()
let showConfirmModalMock = vi.fn()
let populateMasterTabMock = vi.fn(async () => {})

vi.stubGlobal('showAlertModal', (...args) => showAlertModalMock(...args))
vi.stubGlobal('showConfirmModal', (...args) => showConfirmModalMock(...args))
vi.stubGlobal('populateMasterTab', async (...args) => populateMasterTabMock(...args))

// Top-level beforeEach resets the mutable mocks before every test
beforeEach(() => {
  showAlertModalMock = vi.fn()
  showConfirmModalMock = vi.fn()
  populateMasterTabMock = vi.fn(async () => {})
})

afterEach(() => {
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

function parseTableHtml(html) {
  const wrapper = document.createElement('div')
  if (html.trimStart().startsWith('<table')) {
    wrapper.innerHTML = html
  } else {
    wrapper.innerHTML = `<table><tbody>${html}</tbody></table>`
  }
  return wrapper
}

// ---------------------------------------------------------------------------
// _renderPersonalInfoCard
// ---------------------------------------------------------------------------

describe('_renderPersonalInfoCard', () => {
  it('returns a placeholder when pi is empty', () => {
    const html = _renderPersonalInfoCard({})
    expect(html).toContain('No personal information on file')
  })

  it('returns a placeholder when pi has no displayable fields', () => {
    const html = _renderPersonalInfoCard({ contact: {} })
    expect(html).toContain('No personal information on file')
  })

  it('renders the name when provided', () => {
    const html = _renderPersonalInfoCard({ name: 'Jane Smith' })
    const el = parseHtml(html)
    expect(el.textContent).toContain('Jane Smith')
  })

  it('renders the email from contact.email', () => {
    const html = _renderPersonalInfoCard({
      name: 'Jane',
      contact: { email: 'jane@example.com' },
    })
    expect(html).toContain('jane@example.com')
  })

  it('renders the phone from contact.phone', () => {
    const html = _renderPersonalInfoCard({
      name: 'Jane',
      contact: { phone: '555-1234' },
    })
    expect(html).toContain('555-1234')
  })

  it('escapes HTML-special characters in name', () => {
    const html = _renderPersonalInfoCard({ name: '<script>xss</script>' })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('renders location from contact.address city and state', () => {
    const html = _renderPersonalInfoCard({
      name: 'Jane',
      contact: { address: { city: 'Rochester', state: 'NY' } },
    })
    expect(html).toContain('Rochester')
    expect(html).toContain('NY')
  })

  it('wraps rows in a <dl> with class master-info-grid', () => {
    const html = _renderPersonalInfoCard({ name: 'Jane' })
    const el = parseHtml(html)
    expect(el.querySelector('dl.master-info-grid')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// _renderEducationList
// ---------------------------------------------------------------------------

describe('_renderEducationList', () => {
  it('returns "No education" message when array is empty', () => {
    const html = _renderEducationList([])
    expect(html).toContain('No education entries yet')
  })

  it('renders institution names', () => {
    const html = _renderEducationList([
      { degree: 'Ph.D.', institution: 'MIT', location: {} },
    ])
    expect(html).toContain('MIT')
  })

  it('renders degree names', () => {
    const html = _renderEducationList([
      { degree: 'B.Sc.', institution: 'Stanford', location: {} },
    ])
    expect(html).toContain('B.Sc.')
  })

  it('renders field alongside degree when present', () => {
    const html = _renderEducationList([
      { degree: 'M.S.', field: 'Statistics', institution: 'Yale', location: {} },
    ])
    expect(html).toContain('Statistics')
  })

  it('renders a table with thead when there are entries', () => {
    const html = _renderEducationList([
      { degree: 'Ph.D.', institution: 'Harvard', location: {} },
    ])
    const el = parseHtml(html)
    expect(el.querySelector('table')).not.toBeNull()
    expect(el.querySelector('thead')).not.toBeNull()
  })

  it('escapes special characters in institution name', () => {
    const html = _renderEducationList([
      { degree: 'B.A.', institution: 'Smith & Jones', location: {} },
    ])
    expect(html).toContain('Smith &amp; Jones')
  })
})

// ---------------------------------------------------------------------------
// _renderAwardsList
// ---------------------------------------------------------------------------

describe('_renderAwardsList', () => {
  it('returns "No awards" message when array is empty', () => {
    const html = _renderAwardsList([])
    expect(html).toContain('No awards on file')
  })

  it('renders award titles', () => {
    const html = _renderAwardsList([{ title: 'Employee of the Year', year: 2022 }])
    expect(html).toContain('Employee of the Year')
  })

  it('renders the year', () => {
    const html = _renderAwardsList([{ title: 'Best Paper', year: 2020 }])
    expect(html).toContain('2020')
  })

  it('shows — when year is absent', () => {
    const html = _renderAwardsList([{ title: 'Some Award' }])
    const el = parseTableHtml(html)
    const cells = el.querySelectorAll('td')
    const yearCell = Array.from(cells).find(c => c.textContent.trim() === '—')
    expect(yearCell).not.toBeNull()
  })

  it('renders a table with thead when there are awards', () => {
    const html = _renderAwardsList([{ title: 'Award', year: 2021 }])
    const el = parseHtml(html)
    expect(el.querySelector('table')).not.toBeNull()
  })

  it('escapes special characters in award title', () => {
    const html = _renderAwardsList([{ title: 'Best <Researcher>' }])
    expect(html).toContain('Best &lt;Researcher&gt;')
  })
})

// ---------------------------------------------------------------------------
// _renderSummariesList
// ---------------------------------------------------------------------------

describe('_renderSummariesList', () => {
  it('returns "No summaries" message when object is empty', () => {
    const html = _renderSummariesList({})
    expect(html).toContain('No professional summary variants yet')
  })

  it('renders summary keys', () => {
    const html = _renderSummariesList({ ml_engineering: 'Expert in ML.' })
    expect(html).toContain('ml_engineering')
  })

  it('renders a preview of the summary text', () => {
    const html = _renderSummariesList({ leadership: 'I lead teams effectively.' })
    expect(html).toContain('I lead teams effectively.')
  })

  it('truncates long summaries with ellipsis', () => {
    const longText = 'x'.repeat(250)
    const html = _renderSummariesList({ verbose: longText })
    expect(html).toContain('…')
  })

  it('renders multiple summary cards', () => {
    const html = _renderSummariesList({
      alpha: 'Summary A',
      beta:  'Summary B',
    })
    expect(html).toContain('alpha')
    expect(html).toContain('beta')
  })

  it('escapes special characters in keys', () => {
    const html = _renderSummariesList({ '<xss>': 'text' })
    expect(html).toContain('&lt;xss&gt;')
    expect(html).not.toContain('<xss>')
  })
})

// ---------------------------------------------------------------------------
// _renderMasterAchievementsTable
// ---------------------------------------------------------------------------

describe('_renderMasterAchievementsTable', () => {
  it('returns empty state message when achievements array is empty', () => {
    const html = _renderMasterAchievementsTable([])
    expect(html).toContain('No selected achievements yet')
  })

  it('renders achievement titles', () => {
    const html = _renderMasterAchievementsTable([
      { id: 'a1', title: 'Led revenue growth', importance: 9, relevant_for: [] },
    ])
    expect(html).toContain('Led revenue growth')
  })

  it('renders importance value', () => {
    const html = _renderMasterAchievementsTable([
      { id: 'a1', title: 'Some Achievement', importance: 8, relevant_for: [] },
    ])
    const el = parseTableHtml(html)
    expect(el.textContent).toContain('8')
  })

  it('renders relevant_for as comma-separated string', () => {
    const html = _renderMasterAchievementsTable([
      { id: 'a1', title: 'Achievement', importance: 7, relevant_for: ['leadership', 'ML'] },
    ])
    expect(html).toContain('leadership')
    expect(html).toContain('ML')
  })
})

// ---------------------------------------------------------------------------
// Modal close functions — hide the corresponding overlay element
// ---------------------------------------------------------------------------

describe('modal close functions', () => {
  function makeOverlay(id) {
    const el = document.createElement('div')
    el.id = id
    el.style.display = 'flex'
    document.body.appendChild(el)
    return el
  }

  it('closeMasterAchModal hides the overlay', () => {
    const el = makeOverlay('master-ach-modal-overlay')
    closeMasterAchModal()
    expect(el.style.display).toBe('none')
  })

  it('closeMasterSumModal hides the overlay', () => {
    const el = makeOverlay('master-sum-modal-overlay')
    closeMasterSumModal()
    expect(el.style.display).toBe('none')
  })

  it('closePersonalInfoModal hides the overlay', () => {
    const el = makeOverlay('master-pi-modal-overlay')
    closePersonalInfoModal()
    expect(el.style.display).toBe('none')
  })

  it('closeExperienceModal hides the overlay', () => {
    const el = makeOverlay('master-exp-modal-overlay')
    closeExperienceModal()
    expect(el.style.display).toBe('none')
  })

  it('closeSkillModal hides the overlay', () => {
    const el = makeOverlay('master-skill-modal-overlay')
    closeSkillModal()
    expect(el.style.display).toBe('none')
  })

  it('closeEducationModal hides the overlay', () => {
    const el = makeOverlay('master-edu-modal-overlay')
    closeEducationModal()
    expect(el.style.display).toBe('none')
  })

  it('closeAwardModal hides the overlay', () => {
    const el = makeOverlay('master-award-modal-overlay')
    closeAwardModal()
    expect(el.style.display).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Helper: flush all pending microtasks / promise queues
// ---------------------------------------------------------------------------

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ---------------------------------------------------------------------------
// saveMasterAchievement — mock fetch
// ---------------------------------------------------------------------------

describe('saveMasterAchievement', () => {
  // populateMasterTab (local module fn) needs #document-content and 2 fetch calls
  function buildAchievementForm({ title = 'My Achievement', id = '' } = {}) {
    document.body.innerHTML = `
      <div id="document-content"></div>
      <input id="ach-modal-id" value="${id}" />
      <input id="ach-modal-title-input" value="${title}" />
      <textarea id="ach-modal-desc-input">Some description</textarea>
      <input id="ach-modal-relevant-input" value="leadership, ml" />
      <input id="ach-modal-importance-input" value="8" />
      <div id="master-ach-modal-overlay" style="display:flex;"></div>
    `
  }

  // Returns a fetch mock that handles both the main call and populateMasterTab's
  // two sub-calls (/api/master-data/overview + /api/master-data/full)
  function makeFetchMock(mainResponse) {
    return vi.fn().mockImplementation(url => {
      if (url === '/api/master-data/overview') {
        return Promise.resolve({ json: async () => ({}) })
      }
      if (url === '/api/master-data/full') {
        return Promise.resolve({
          json: async () => ({
            personal_info: {}, experience: [], skills: [],
            education: [], awards: [], selected_achievements: [],
            professional_summaries: {},
          }),
        })
      }
      return Promise.resolve({ json: async () => mainResponse })
    })
  }

  it('posts to /api/master-data/update-achievement', async () => {
    buildAchievementForm()
    const mockFetch = makeFetchMock({ ok: true, action: 'created' })
    vi.stubGlobal('fetch', mockFetch)

    await saveMasterAchievement()
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/master-data/update-achievement',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls showAlertModal on success', async () => {
    buildAchievementForm({ title: 'Great Work' })
    vi.stubGlobal('fetch', makeFetchMock({ ok: true, action: 'created' }))

    await saveMasterAchievement()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Saved'),
      expect.stringContaining('Great Work')
    )
  })

  it('populateMasterTab is invoked on success (via DOM refresh)', async () => {
    // populateMasterTab is a module-local function; we verify it ran by checking
    // that #document-content was updated (the loading spinner -> master CV HTML).
    buildAchievementForm()
    vi.stubGlobal('fetch', makeFetchMock({ ok: true, action: 'created' }))

    await saveMasterAchievement()
    await flushPromises()

    const content = document.getElementById('document-content')
    // populateMasterTab sets innerHTML to either loading state or full page
    expect(content.innerHTML).not.toBe('')
  })

  it('shows error alert on API failure (ok: false)', async () => {
    buildAchievementForm()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: 'DB error' }),
    }))

    await saveMasterAchievement()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.stringContaining('DB error')
    )
  })

  it('shows error alert when fetch throws', async () => {
    buildAchievementForm()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    await saveMasterAchievement()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.any(String)
    )
  })

  it('shows validation error when title is empty', async () => {
    buildAchievementForm({ title: '' })
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await saveMasterAchievement()

    expect(mockFetch).not.toHaveBeenCalled()
    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Validation'),
      expect.any(String)
    )
  })
})

// ---------------------------------------------------------------------------
// deleteMasterExperience — uses showConfirmModal callback pattern
// ---------------------------------------------------------------------------

describe('deleteMasterExperience', () => {
  // Add document-content so populateMasterTab (local fn) doesn't throw
  function buildExpDeleteDom() {
    document.body.innerHTML = '<div id="document-content"></div>'
  }

  // Fetch mock that handles populateMasterTab sub-calls too
  function makeExpFetchMock(deleteResponse) {
    return vi.fn().mockImplementation(url => {
      if (url === '/api/master-data/overview') return Promise.resolve({ json: async () => ({}) })
      if (url === '/api/master-data/full') return Promise.resolve({
        json: async () => ({
          personal_info: {}, experience: [], skills: [],
          education: [], awards: [], selected_achievements: [],
          professional_summaries: {},
        }),
      })
      return Promise.resolve({ json: async () => deleteResponse })
    })
  }

  it('calls showConfirmModal before proceeding', async () => {
    await deleteMasterExperience('exp-1', 'Senior Engineer')
    expect(showConfirmModalMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Senior Engineer'),
      expect.any(Function)
    )
  })

  it('does nothing (no fetch) when confirmation is declined', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    // showConfirmModalMock does NOT invoke callback by default

    await deleteMasterExperience('exp-1', 'Some Job')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('posts to /api/master-data/experience when confirmed', async () => {
    buildExpDeleteDom()
    const mockFetch = makeExpFetchMock({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    showConfirmModalMock = vi.fn((_title, _msg, cb) => cb())

    await deleteMasterExperience('exp-42', 'Engineer')
    await flushPromises()

    const experienceCalls = mockFetch.mock.calls.filter(
      ([url]) => url === '/api/master-data/experience'
    )
    expect(experienceCalls.length).toBeGreaterThan(0)
    const body = JSON.parse(experienceCalls[0][1].body)
    expect(body.action).toBe('delete')
    expect(body.id).toBe('exp-42')
  })

  it('calls showAlertModal with success on confirmed delete', async () => {
    buildExpDeleteDom()
    vi.stubGlobal('fetch', makeExpFetchMock({ ok: true }))
    showConfirmModalMock = vi.fn((_t, _m, cb) => cb())

    await deleteMasterExperience('exp-1', 'My Job')
    await flushPromises()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Deleted'),
      expect.any(String)
    )
  })
})

// ---------------------------------------------------------------------------
// saveMasterSkill — mock fetch
// ---------------------------------------------------------------------------

describe('saveMasterSkill', () => {
  // populateMasterTab (local) needs #document-content + overview/full endpoints
  function buildSkillForm({ skill = 'Python', category = '', isFlat = '1' } = {}) {
    document.body.innerHTML = `
      <div id="document-content"></div>
      <input id="skill-name-input" value="${skill}" />
      <input id="skill-modal-category" value="${category}" />
      <input id="skill-modal-is-flat" value="${isFlat}" />
      <input id="skill-modal-original-name" value="" />
      <input id="skill-experiences-input" value="" />
      <div id="master-skill-modal-overlay" style="display:flex;"></div>
    `
  }

  function makeSkillFetchMock(skillResponse) {
    return vi.fn().mockImplementation(url => {
      if (url === '/api/master-data/overview') return Promise.resolve({ json: async () => ({}) })
      if (url === '/api/master-data/full') return Promise.resolve({
        json: async () => ({
          personal_info: {}, experience: [], skills: [],
          education: [], awards: [], selected_achievements: [],
          professional_summaries: {},
        }),
      })
      return Promise.resolve({ json: async () => skillResponse })
    })
  }

  it('posts to /api/master-data/skill', async () => {
    buildSkillForm()
    const mockFetch = makeSkillFetchMock({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await saveMasterSkill()
    await flushPromises()

    const skillCalls = mockFetch.mock.calls.filter(([url]) => url === '/api/master-data/skill')
    expect(skillCalls.length).toBeGreaterThan(0)
    expect(skillCalls[0][1]).toMatchObject({ method: 'POST' })
  })

  it('populateMasterTab runs on success (DOM is updated)', async () => {
    // populateMasterTab is local — verify by checking DOM update after success
    buildSkillForm()
    vi.stubGlobal('fetch', makeSkillFetchMock({ ok: true }))

    await saveMasterSkill()
    await flushPromises()

    const content = document.getElementById('document-content')
    expect(content.innerHTML).not.toBe('')
  })

  it('shows error alert on API failure', async () => {
    buildSkillForm()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: 'skill exists' }),
    }))

    await saveMasterSkill()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.stringContaining('skill exists')
    )
  })

  it('shows validation error when skill name is empty', async () => {
    buildSkillForm({ skill: '' })
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await saveMasterSkill()

    expect(mockFetch).not.toHaveBeenCalled()
    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Validation'),
      expect.any(String)
    )
  })

  it('includes category in body for categorised (non-flat) skills', async () => {
    buildSkillForm({ skill: 'TensorFlow', category: 'ml', isFlat: '0' })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await saveMasterSkill()

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.category).toBe('ml')
    expect(body.skill).toBe('TensorFlow')
  })
})

// ---------------------------------------------------------------------------
// deleteMasterSkill — uses showConfirmModal callback pattern
// ---------------------------------------------------------------------------

describe('deleteMasterSkill', () => {
  function buildSkillDeleteDom() {
    document.body.innerHTML = '<div id="document-content"></div>'
  }

  function makeDeleteSkillFetchMock(deleteResponse) {
    return vi.fn().mockImplementation(url => {
      if (url === '/api/master-data/overview') return Promise.resolve({ json: async () => ({}) })
      if (url === '/api/master-data/full') return Promise.resolve({
        json: async () => ({
          personal_info: {}, experience: [], skills: [],
          education: [], awards: [], selected_achievements: [],
          professional_summaries: {},
        }),
      })
      return Promise.resolve({ json: async () => deleteResponse })
    })
  }

  it('calls showConfirmModal before proceeding', async () => {
    await deleteMasterSkill('Python', '', true)
    expect(showConfirmModalMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Python'),
      expect.any(Function)
    )
  })

  it('does not fetch when confirmation is declined', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await deleteMasterSkill('Python', '', true)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('posts delete to /api/master-data/skill when confirmed', async () => {
    buildSkillDeleteDom()
    const mockFetch = makeDeleteSkillFetchMock({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    showConfirmModalMock = vi.fn((_title, _msg, cb) => cb())

    await deleteMasterSkill('Python', 'Programming', false)
    await flushPromises()

    const skillCalls = mockFetch.mock.calls.filter(([url]) => url === '/api/master-data/skill')
    expect(skillCalls.length).toBeGreaterThan(0)
    const body = JSON.parse(skillCalls[0][1].body)
    expect(body).toEqual({ action: 'delete', skill: 'Python', category: 'Programming' })
  })
})

// ---------------------------------------------------------------------------
// deleteMasterSummary — uses showConfirmModal callback pattern
// ---------------------------------------------------------------------------

describe('deleteMasterSummary', () => {
  function buildSumDeleteDom() {
    document.body.innerHTML = '<div id="document-content"></div>'
  }

  function makeSumFetchMock(deleteResponse) {
    return vi.fn().mockImplementation(url => {
      if (url === '/api/master-data/overview') return Promise.resolve({ json: async () => ({}) })
      if (url === '/api/master-data/full') return Promise.resolve({
        json: async () => ({
          personal_info: {}, experience: [], skills: [],
          education: [], awards: [], selected_achievements: [],
          professional_summaries: {},
        }),
      })
      return Promise.resolve({ json: async () => deleteResponse })
    })
  }

  it('calls showConfirmModal with the key in the message', async () => {
    await deleteMasterSummary('ml_engineering')
    expect(showConfirmModalMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('ml_engineering'),
      expect.any(Function)
    )
  })

  it('does not fetch when confirmation is declined', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    // showConfirmModalMock does NOT invoke callback

    await deleteMasterSummary('leadership')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('posts to /api/master-data/update-summary when confirmed', async () => {
    buildSumDeleteDom()
    const mockFetch = makeSumFetchMock({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    showConfirmModalMock = vi.fn((_t, _m, cb) => cb())

    await deleteMasterSummary('leadership')
    await flushPromises()

    const sumCalls = mockFetch.mock.calls.filter(
      ([url]) => url === '/api/master-data/update-summary'
    )
    expect(sumCalls.length).toBeGreaterThan(0)
    const body = JSON.parse(sumCalls[0][1].body)
    expect(body.action).toBe('delete')
    expect(body.key).toBe('leadership')
  })

  it('calls showAlertModal with success on confirmed delete', async () => {
    buildSumDeleteDom()
    vi.stubGlobal('fetch', makeSumFetchMock({ ok: true }))
    showConfirmModalMock = vi.fn((_t, _m, cb) => cb())

    await deleteMasterSummary('leadership')
    await flushPromises()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Deleted'),
      expect.stringContaining('leadership')
    )
  })

  it('shows error alert when API returns ok: false', async () => {
    vi.stubGlobal('fetch', makeSumFetchMock({ ok: false, error: 'not found' }))
    showConfirmModalMock = vi.fn((_t, _m, cb) => cb())

    await deleteMasterSummary('missing_key')
    await flushPromises()

    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.any(String)
    )
  })
})

// ---------------------------------------------------------------------------
// Publications import / convert / sort-group controls
// ---------------------------------------------------------------------------

describe('publications UI flows', () => {
  function buildPublicationsDom() {
    document.body.innerHTML = `
      <div id="master-pub-crud-container"></div>
      <textarea id="master-pub-textarea"></textarea>
      <span id="master-pub-count"></span>
      <div id="master-pub-import-modal-overlay" style="display:none"></div>
      <textarea id="master-pub-import-textarea"></textarea>
      <input id="master-pub-import-overwrite" type="checkbox" />
      <div id="master-pub-import-status"></div>
      <button id="master-pub-import-submit-btn">Import</button>
      <div id="master-pub-convert-modal-overlay" style="display:none"></div>
      <textarea id="master-pub-convert-input"></textarea>
      <textarea id="master-pub-convert-output"></textarea>
      <input id="master-pub-convert-overwrite" type="checkbox" />
      <div id="master-pub-convert-status"></div>
      <button id="master-pub-convert-submit-btn">Generate BibTeX</button>
      <button id="master-pub-convert-import-btn">Import Preview</button>
    `
  }

  const publicationsFixture = [
    {
      key: 'b2024',
      type: 'book',
      formatted_citation: 'Book citation',
      fields: { year: '2024' },
    },
    {
      key: 'a2022',
      type: 'article',
      formatted_citation: 'Article citation',
      fields: { year: '2022' },
    },
    {
      key: 'c2024',
      type: 'article',
      formatted_citation: 'Newer article citation',
      fields: { year: '2024' },
    },
  ]

  beforeEach(async () => {
    buildPublicationsDom()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, publications: [], content: '', count: 0 }),
    }))
    setPublicationSortMode('year_desc')
    await flushPromises()
    setPublicationGroupMode('none')
    await flushPromises()
  })

  it('renders publications sorted by newest year first by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, publications: publicationsFixture, content: '', count: 3 }),
    }))

    await loadPublications()

    const text = document.getElementById('master-pub-crud-container').textContent
    expect(text.indexOf('c2024')).toBeLessThan(text.indexOf('a2022'))
  })

  it('re-sorts publications by type when the type sort control is selected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, publications: publicationsFixture, content: '', count: 3 }),
    }))

    setPublicationSortMode('type_asc')
    await flushPromises()

    const text = document.getElementById('master-pub-crud-container').textContent
    expect(text.indexOf('a2022')).toBeLessThan(text.indexOf('b2024'))
  })

  it('groups publications by year when the year grouping control is selected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, publications: publicationsFixture, content: '', count: 3 }),
    }))

    setPublicationGroupMode('year')
    await flushPromises()

    const html = document.getElementById('master-pub-crud-container').innerHTML
    expect(html).toContain('>2024<')
    expect(html).toContain('>2022<')
  })

  it('imports pasted BibTeX and reports the merge counts', async () => {
    document.getElementById('master-pub-import-textarea').value = '@article{smith2025, title={X}}'
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, added: 1, updated: 0, skipped: 0 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, publications: publicationsFixture, content: '', count: 3 }),
      })
    vi.stubGlobal('fetch', mockFetch)

    await importPublicationsBib()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/master-data/publications/import',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(document.getElementById('master-pub-import-status').textContent).toContain('Imported')
    expect(showAlertModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Imported'),
      expect.stringContaining('1 added'),
    )
  })

  it('converts citation text into a BibTeX preview without importing it yet', async () => {
    document.getElementById('master-pub-convert-input').value = 'Doe, J. (2025). Example.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, bibtex: '@article{doe2025, title={Example}}' }),
    }))

    await convertPublicationText()

    expect(document.getElementById('master-pub-convert-output').value).toContain('@article{doe2025')
    expect(document.getElementById('master-pub-convert-status').textContent).toContain('Review the generated BibTeX')
  })

  it('imports the reviewed converted BibTeX through the import endpoint', async () => {
    document.getElementById('master-pub-convert-output').value = '@article{doe2025, title={Example}}'
    document.getElementById('master-pub-convert-overwrite').checked = true
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, added: 0, updated: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, publications: publicationsFixture, content: '', count: 3 }),
      })
    vi.stubGlobal('fetch', mockFetch)

    await importConvertedPublicationText()

    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(firstCallBody.overwrite).toBe(true)
    expect(firstCallBody.bibtex_text).toContain('@article{doe2025')
    expect(document.getElementById('master-pub-convert-status').textContent).toContain('Imported preview')
  })
})
