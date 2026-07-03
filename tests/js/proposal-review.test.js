// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/proposal-review.test.js
 * Unit tests for web/proposal-review.js — the shared diff-row renderer
 * extracted from harvest.js (GAP-01), used by both harvest.js and
 * web/master-data-ai-update.js.
 */

import { esc, renderProposalRow, attachProposalRowListeners } from '../../web/proposal-review.js'

afterEach(() => {
  document.body.innerHTML = ''
})

// ── esc ───────────────────────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('handles null/undefined as empty string', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })

  it('coerces non-string input', () => {
    expect(esc(42)).toBe('42')
  })
})

// ── renderProposalRow ────────────────────────────────────────────────────────

describe('renderProposalRow', () => {
  it('renders a checkbox with the configured idPrefix, not a hardcoded one', () => {
    const html = renderProposalRow(
      { id: 'abc123', label: 'Some label' },
      { idPrefix: 'harvest', checkboxDataAttr: 'harvestId' },
    )
    expect(html).toContain('id="harvest-chk-abc123"')
    expect(html).toContain('id="harvest-row-abc123"')
    expect(html).toContain('data-harvestId="abc123"')
  })

  it('uses a different idPrefix for a different caller without collision', () => {
    const html = renderProposalRow(
      { id: 'xyz789', label: 'Other label' },
      { idPrefix: 'mdu', checkboxDataAttr: 'mduId' },
    )
    expect(html).toContain('id="mdu-chk-xyz789"')
    expect(html).toContain('id="mdu-row-xyz789"')
    expect(html).not.toContain('harvest-chk-')
  })

  it('marks the checkbox checked when item.checked is true', () => {
    const checkedHtml = renderProposalRow({ id: '1', label: 'L', checked: true }, { idPrefix: 'x' })
    const uncheckedHtml = renderProposalRow({ id: '1', label: 'L', checked: false }, { idPrefix: 'x' })
    expect(checkedHtml).toMatch(/<input[^>]*checked/)
    expect(uncheckedHtml).not.toMatch(/<input[^>]*checked/)
  })

  it('renders Before/After blocks only when original/proposed are present', () => {
    const withBoth = renderProposalRow({ id: '1', label: 'L', original: 'old text', proposed: 'new text' }, { idPrefix: 'x' })
    expect(withBoth).toContain('Before')
    expect(withBoth).toContain('old text')
    expect(withBoth).toContain('After')
    expect(withBoth).toContain('new text')

    const addOnly = renderProposalRow({ id: '1', label: 'L', proposed: 'new text' }, { idPrefix: 'x' })
    expect(addOnly).not.toContain('Before')
    expect(addOnly).toContain('After')
  })

  it('composes the aria-label from label + ariaLabelSuffix', () => {
    const html = renderProposalRow(
      { id: '1', label: 'New skill' },
      { idPrefix: 'mdu', ariaLabelSuffix: ', possible duplicate of exp_005' },
    )
    expect(html).toContain('aria-label="New skill, possible duplicate of exp_005"')
  })

  it('escapes label/original/proposed to prevent HTML injection', () => {
    const html = renderProposalRow({ id: '1', label: '<img src=x onerror=alert(1)>' }, { idPrefix: 'x' })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img')
  })

  it('renders the flagHtml banner when provided', () => {
    const html = renderProposalRow(
      { id: '1', label: 'L', flagHtml: '<div class="dup-flag">duplicate</div>' },
      { idPrefix: 'x' },
    )
    expect(html).toContain('duplicate')
  })

  it('renders a detail toggle button using data-toggle-reasoning, never inline onclick', () => {
    const withDetail = renderProposalRow({ id: 'row1', label: 'L', detailText: 'why this was proposed' }, { idPrefix: 'harvest' })
    expect(withDetail).toContain('data-toggle-reasoning="row1"')
    expect(withDetail).not.toContain('onclick="toggleHarvestReasoning')
    expect(withDetail).not.toContain('onclick=')

    const withoutDetail = renderProposalRow({ id: 'row2', label: 'L' }, { idPrefix: 'harvest' })
    expect(withoutDetail).not.toContain('data-toggle-reasoning')
  })
})

// ── attachProposalRowListeners ───────────────────────────────────────────────

describe('attachProposalRowListeners', () => {
  function mountRow(idPrefix, detailText = 'detail text here') {
    const container = document.createElement('div')
    container.innerHTML = `<table>${renderProposalRow(
      { id: 'r1', label: 'L', detailText },
      { idPrefix },
    )}</table>`
    document.body.appendChild(container)
    return container
  }

  it('toggles the reason block visibility on click', () => {
    const container = mountRow('harvest')
    attachProposalRowListeners(container, 'harvest')

    const reasonEl = document.getElementById('harvest-reason-r1')
    const toggleBtn = container.querySelector('[data-toggle-reasoning="r1"]')
    expect(reasonEl.style.display).toBe('none')

    toggleBtn.click()
    expect(reasonEl.style.display).toBe('block')
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true')

    toggleBtn.click()
    expect(reasonEl.style.display).toBe('none')
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
  })

  it('does not throw when clicking somewhere else in the container', () => {
    const container = mountRow('harvest')
    attachProposalRowListeners(container, 'harvest')
    expect(() => container.querySelector('td').click()).not.toThrow()
  })

  it('calls the onToggleReasoning handler with the row id', () => {
    const container = mountRow('mdu')
    const handler = vi.fn()
    attachProposalRowListeners(container, 'mdu', { onToggleReasoning: handler })
    container.querySelector('[data-toggle-reasoning="r1"]').click()
    expect(handler).toHaveBeenCalledWith('r1')
  })

  it('does not attach a second listener on repeated calls (no double-toggle)', () => {
    const container = mountRow('harvest')
    attachProposalRowListeners(container, 'harvest')
    attachProposalRowListeners(container, 'harvest') // second call should be a no-op

    const reasonEl = document.getElementById('harvest-reason-r1')
    const toggleBtn = container.querySelector('[data-toggle-reasoning="r1"]')
    toggleBtn.click()
    // If two listeners had been attached, two toggles would cancel out and
    // leave the panel closed again — assert it actually opened.
    expect(reasonEl.style.display).toBe('block')
  })

  it('is a no-op when containerEl is null', () => {
    expect(() => attachProposalRowListeners(null, 'harvest')).not.toThrow()
  })
})
