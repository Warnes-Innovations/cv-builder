// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/utils.test.js
 * Unit tests for web/utils.js — pure utility functions.
 */
import {
  normalizeText, fmtDate, cleanJsonResponse, extractFirstJsonObject, escapeHtml,
  extractTitleAndCompanyFromJobText, normalizePositionLabel,
  stripHtml, truncateText, capitalizeWords, pluralize,
  formatDuration, ordinal,
} from '../../web/utils.js'

// ── normalizeText ─────────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
  })
  it('collapses internal spaces', () => {
    expect(normalizeText('hello   world')).toBe('hello world')
  })
  it('collapses tabs and newlines', () => {
    expect(normalizeText('hello\t\nworld')).toBe('hello world')
  })
  it('returns empty string unchanged', () => {
    expect(normalizeText('')).toBe('')
  })
  it('handles already-clean text', () => {
    expect(normalizeText('clean text')).toBe('clean text')
  })
})

// ── fmtDate ───────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('formats a known Unix timestamp', () => {
    // 2024-03-15 12:00:00 UTC — midday, safe against timezone boundary issues
    const result = fmtDate(1710504000)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
  })
  it('returns a non-empty string', () => {
    expect(typeof fmtDate(0)).toBe('string')
    expect(fmtDate(0).length).toBeGreaterThan(0)
  })
})

// ── cleanJsonResponse ─────────────────────────────────────────────────────────

describe('cleanJsonResponse', () => {
  it('strips ```json fences', () => {
    expect(cleanJsonResponse('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('strips plain ``` fences', () => {
    expect(cleanJsonResponse('```\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('is case-insensitive for json tag', () => {
    expect(cleanJsonResponse('```JSON\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('leaves plain JSON unchanged', () => {
    expect(cleanJsonResponse('{"a":1}')).toBe('{"a":1}')
  })
  it('trims surrounding whitespace', () => {
    expect(cleanJsonResponse('  {"a":1}  ')).toBe('{"a":1}')
  })
})

// ── extractFirstJsonObject ───────────────────────────────────────────────────

describe('extractFirstJsonObject', () => {
  it('parses a plain JSON object', () => {
    expect(extractFirstJsonObject('{"a":1}')).toEqual({ a: 1 })
  })

  it('extracts JSON embedded in assistant text', () => {
    expect(extractFirstJsonObject('Here are recommendations:\n{"recommended_skills":["Python"]}\nPlease review.')).toEqual({
      recommended_skills: ['Python'],
    })
  })

  it('handles braces inside JSON strings', () => {
    expect(extractFirstJsonObject('{"message":"use {braces} safely","ok":true} trailing text')).toEqual({
      message: 'use {braces} safely',
      ok: true,
    })
  })

  it('returns null when no valid JSON object exists', () => {
    expect(extractFirstJsonObject('no json here')).toBeNull()
  })
})

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes &', () => expect(escapeHtml('a&b')).toBe('a&amp;b'))
  it('escapes <', () => expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;'))
  it('escapes >', () => expect(escapeHtml('a>b')).toBe('a&gt;b'))
  it('escapes double quote', () => expect(escapeHtml('"hi"')).toBe('&quot;hi&quot;'))
  it("escapes single quote", () => expect(escapeHtml("it's")).toBe('it&#039;s'))
  it('leaves safe text unchanged', () => expect(escapeHtml('hello world')).toBe('hello world'))
  it('handles multiple special chars in one string', () => {
    expect(escapeHtml('<b>AT&T</b>')).toBe('&lt;b&gt;AT&amp;T&lt;/b&gt;')
  })
})

// ── extractTitleAndCompanyFromJobText ─────────────────────────────────────────

describe('extractTitleAndCompanyFromJobText', () => {
  it('parses "Title | Company"', () => {
    const { title, company } = extractTitleAndCompanyFromJobText('Senior Engineer | Acme Corp\nDescription')
    expect(title).toBe('Senior Engineer')
    expect(company).toBe('Acme Corp')
  })
  it('parses "Title at Company"', () => {
    const { title, company } = extractTitleAndCompanyFromJobText('Software Engineer at Acme Corp\nDescription')
    expect(title).toBe('Software Engineer')
    expect(company).toBe('Acme Corp')
  })
  it('is case-insensitive for " at "', () => {
    const { title, company } = extractTitleAndCompanyFromJobText('Analyst AT BigCo\nMore text')
    expect(title).toBe('Analyst')
    expect(company).toBe('BigCo')
  })
  it('falls back to first line as title when no pattern matches', () => {
    const { title } = extractTitleAndCompanyFromJobText('Some Job\nSome description line')
    expect(title).toBe('Some Job')
  })
  it('returns default title when text is empty', () => {
    const { title } = extractTitleAndCompanyFromJobText('')
    expect(title).toBe('Untitled Position')
  })
})

// ── normalizePositionLabel ────────────────────────────────────────────────────

describe('normalizePositionLabel', () => {
  it('capitalizes each word', () => {
    expect(normalizePositionLabel('senior data scientist', '')).toBe('Senior Data Scientist')
  })
  it('strips trailing "role"', () => {
    expect(normalizePositionLabel('engineering role', '')).toBe('Engineering')
  })
  it('strips trailing "position"', () => {
    expect(normalizePositionLabel('manager position', '')).toBe('Manager')
  })
  it('returns fallback for empty input', () => {
    expect(normalizePositionLabel('', '')).toBe('Professional Role')
  })
})

// ── stripHtml ─────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes simple tags', () => {
    expect(stripHtml('<b>hello</b>')).toBe('hello')
  })
  it('removes multiple tags', () => {
    expect(stripHtml('<b>hello</b> <i>world</i>')).toBe('hello world')
  })
  it('leaves plain text unchanged', () => {
    expect(stripHtml('hello')).toBe('hello')
  })
  it('handles self-closing tags', () => {
    expect(stripHtml('line1<br/>line2')).toBe('line1line2')
  })
  it('removes script contents entirely', () => {
    expect(stripHtml('before<script>alert(1)</script>after')).toBe('beforeafter')
  })
})

// ── truncateText ──────────────────────────────────────────────────────────────

describe('truncateText', () => {
  it('leaves text shorter than maxLength unchanged', () => {
    expect(truncateText('hello', 100)).toBe('hello')
  })
  it('leaves text exactly at maxLength unchanged', () => {
    const text = 'a'.repeat(100)
    expect(truncateText(text, 100)).toBe(text)
  })
  it('appends ellipsis when truncating', () => {
    const result = truncateText('one two three four five six seven', 15)
    expect(result.endsWith('…')).toBe(true)
  })
  it('result is no longer than maxLength + 1 (ellipsis char)', () => {
    const result = truncateText('word1 word2 word3 word4 word5', 20)
    expect(result.length).toBeLessThanOrEqual(21)
  })
  it('uses default maxLength of 100', () => {
    const long = 'word '.repeat(25)   // 125 chars
    const result = truncateText(long)
    expect(result.length).toBeLessThanOrEqual(101)
  })
})

// ── capitalizeWords ───────────────────────────────────────────────────────────

describe('capitalizeWords', () => {
  it('capitalizes first letter of each word', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World')
  })
  it('lowercases the rest of each word', () => {
    expect(capitalizeWords('HELLO WORLD')).toBe('Hello World')
  })
  it('handles single word', () => {
    expect(capitalizeWords('python')).toBe('Python')
  })
})

// ── pluralize ─────────────────────────────────────────────────────────────────

describe('pluralize', () => {
  it('returns singular for count 1', () => expect(pluralize(1, 'item', 'items')).toBe('item'))
  it('returns plural for count 0', () => expect(pluralize(0, 'item', 'items')).toBe('items'))
  it('returns plural for count > 1', () => expect(pluralize(3, 'item', 'items')).toBe('items'))
  it('returns plural for negative count', () => expect(pluralize(-1, 'item', 'items')).toBe('items'))
})

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats pure seconds', () => expect(formatDuration(5000)).toBe('5s'))
  it('formats zero seconds', () => expect(formatDuration(0)).toBe('0s'))
  it('formats minutes and seconds', () => expect(formatDuration(65000)).toBe('1m 5s'))
  it('formats hours and minutes', () => expect(formatDuration(3700000)).toBe('1h 1m'))
  it('formats exact minutes', () => expect(formatDuration(120000)).toBe('2m 0s'))
})

// ── ordinal ───────────────────────────────────────────────────────────────────

describe('ordinal', () => {
  it('1 → 1st', () => expect(ordinal(1)).toBe('1st'))
  it('2 → 2nd', () => expect(ordinal(2)).toBe('2nd'))
  it('3 → 3rd', () => expect(ordinal(3)).toBe('3rd'))
  it('4 → 4th', () => expect(ordinal(4)).toBe('4th'))
  it('11 → 11th (special case)', () => expect(ordinal(11)).toBe('11th'))
  it('12 → 12th (special case)', () => expect(ordinal(12)).toBe('12th'))
  it('13 → 13th (special case)', () => expect(ordinal(13)).toBe('13th'))
  it('21 → 21st', () => expect(ordinal(21)).toBe('21st'))
  it('22 → 22nd', () => expect(ordinal(22)).toBe('22nd'))
  it('101 → 101st', () => expect(ordinal(101)).toBe('101st'))
})
