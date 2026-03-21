/**
 * tests/js/job-analysis.test.js
 * Unit tests for web/job-analysis.js — pure helper functions only.
 * (analyzeJob itself is orchestration-heavy and covered by integration tests.)
 */
import {
  normalizePostAnalysisQuestions,
  extractStructuredQuestionsFromAssistantText,
  mergePostAnalysisQuestions,
} from '../../web/job-analysis.js'

// ── normalizePostAnalysisQuestions ────────────────────────────────────────

describe('normalizePostAnalysisQuestions', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizePostAnalysisQuestions(null)).toEqual([])
    expect(normalizePostAnalysisQuestions(undefined)).toEqual([])
    expect(normalizePostAnalysisQuestions('bad')).toEqual([])
  })

  it('filters out items with missing or empty question text', () => {
    const raw = [
      { question: '', type: 't1', choices: [] },
      { question: '  ', type: 't2', choices: [] },
      { type: 't3', choices: [] },
    ]
    expect(normalizePostAnalysisQuestions(raw)).toEqual([])
  })

  it('trims question text', () => {
    const raw = [{ question: '  What is your goal?  ', type: 'goal', choices: [] }]
    expect(normalizePostAnalysisQuestions(raw)[0].question).toBe('What is your goal?')
  })

  it('assigns default type when type is missing', () => {
    const raw = [{ question: 'Q1?', choices: [] }]
    expect(normalizePostAnalysisQuestions(raw)[0].type).toBe('clarification_1')
  })

  it('defaults choices to [] when not an array', () => {
    const raw = [{ question: 'Q?', type: 't', choices: 'bad' }]
    expect(normalizePostAnalysisQuestions(raw)[0].choices).toEqual([])
  })

  it('preserves valid questions', () => {
    const raw = [
      { question: 'Q1?', type: 'experience_level', choices: ['A', 'B'] },
      { question: 'Q2?', type: 'leadership_focus', choices: [] },
    ]
    const result = normalizePostAnalysisQuestions(raw)
    expect(result).toHaveLength(2)
    expect(result[0].choices).toEqual(['A', 'B'])
  })
})

// ── extractStructuredQuestionsFromAssistantText ───────────────────────────

describe('extractStructuredQuestionsFromAssistantText', () => {
  it('returns [] for empty / non-string input', () => {
    expect(extractStructuredQuestionsFromAssistantText('')).toEqual([])
    expect(extractStructuredQuestionsFromAssistantText(null)).toEqual([])
  })

  it('returns [] when no numbered list is present', () => {
    expect(extractStructuredQuestionsFromAssistantText('Just plain text.')).toEqual([])
  })

  it('extracts numbered questions from assistant text', () => {
    const text = 'Here are some questions:\n1. What is your level?\n2. What domain?'
    const qs = extractStructuredQuestionsFromAssistantText(text)
    expect(qs).toHaveLength(2)
    expect(qs[0].question).toContain('What is your level?')
    expect(qs[0].type).toBe('clarification_1')
    expect(qs[0].choices).toEqual([])
  })

  it('extracts at most 4 questions', () => {
    const text = Array.from({ length: 8 }, (_, i) => `${i + 1}. Q${i + 1}?`).join('\n')
    const qs = extractStructuredQuestionsFromAssistantText(text)
    expect(qs).toHaveLength(4)
  })

  it('assigns sequential clarification types', () => {
    const text = '1. First?\n2. Second?\n3. Third?'
    const qs = extractStructuredQuestionsFromAssistantText(text)
    expect(qs.map(q => q.type)).toEqual(['clarification_1', 'clarification_2', 'clarification_3'])
  })
})

// ── mergePostAnalysisQuestions ────────────────────────────────────────────

describe('mergePostAnalysisQuestions', () => {
  it('returns incoming questions when existing is empty', () => {
    const incoming = [{ question: 'New Q?', type: 'new_t', choices: [] }]
    expect(mergePostAnalysisQuestions([], incoming)).toHaveLength(1)
  })

  it('preserves existing questions', () => {
    const existing = [{ question: 'Existing Q?', type: 'existing_t', choices: [] }]
    expect(mergePostAnalysisQuestions(existing, [])).toHaveLength(1)
  })

  it('deduplicates by question text (case-insensitive)', () => {
    const existing = [{ question: 'What is your level?', type: 't1', choices: [] }]
    const incoming = [{ question: 'What is YOUR level?', type: 't2', choices: [] }]
    expect(mergePostAnalysisQuestions(existing, incoming)).toHaveLength(1)
  })

  it('adds genuinely new incoming questions', () => {
    const existing = [{ question: 'Q1?', type: 't1', choices: [] }]
    const incoming = [{ question: 'Q2?', type: 't2', choices: [] }]
    expect(mergePostAnalysisQuestions(existing, incoming)).toHaveLength(2)
  })

  it('de-conflicts duplicate type names', () => {
    const existing = [{ question: 'Q1?', type: 'clarification_1', choices: [] }]
    const incoming = [{ question: 'Q2?', type: 'clarification_1', choices: [] }]
    const merged = mergePostAnalysisQuestions(existing, incoming)
    const types = merged.map(q => q.type)
    expect(new Set(types).size).toBe(types.length) // all types unique
  })

  it('returns empty array for null/undefined inputs', () => {
    expect(mergePostAnalysisQuestions(null, null)).toEqual([])
  })
})
