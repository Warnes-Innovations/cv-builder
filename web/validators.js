/**
 * web/validators.js
 * API response validators — DTO mirrors of Python dataclasses in web_app.py.
 *
 * Each function checks that required fields are present in an API response and
 * logs a console.warn if any are missing or have an unexpected type.  Validators
 * return the original data object unchanged so they can be used inline.
 *
 * Update both this file and the Python dataclasses in web_app.py together
 * whenever adding or removing response fields.
 *
 * DEPENDENCIES: none
 */

/** Validate GET /api/status response. */
function parseStatusResponse(data) {
  const required = [
    'phase', 'llm_provider', 'job_description',
    'post_analysis_questions', 'post_analysis_answers',
    'all_experience_ids', 'all_skills', 'all_achievements',
    'professional_summaries', 'copilot_auth', 'iterating',
    'experience_decisions', 'skill_decisions',
    'achievement_decisions', 'publication_decisions',
    'extra_skills', 'session_file',
  ];
  const missing = required.filter(k => !(k in data));
  if (missing.length) {
    console.warn('[parseStatusResponse] Missing fields:', missing, data);
  }
  if ('post_analysis_questions' in data && !Array.isArray(data.post_analysis_questions)) {
    console.warn('[parseStatusResponse] post_analysis_questions should be an array:', data.post_analysis_questions);
  }
  if ('all_experience_ids' in data && !Array.isArray(data.all_experience_ids)) {
    console.warn('[parseStatusResponse] all_experience_ids should be an array:', data.all_experience_ids);
  }
  return data;
}

/** Validate GET /api/sessions response. */
function parseSessionListResponse(data) {
  if (!Array.isArray(data.sessions)) {
    console.warn('[parseSessionListResponse] sessions should be an array:', data);
  } else {
    const itemRequired = ['path', 'position_name', 'timestamp', 'phase', 'has_job', 'has_analysis', 'has_customizations'];
    data.sessions.forEach((s, i) => {
      const missing = itemRequired.filter(k => !(k in s));
      if (missing.length) console.warn(`[parseSessionListResponse] sessions[${i}] missing fields:`, missing, s);
    });
  }
  return data;
}

/** Validate GET /api/rewrites response. */
function parseRewritesResponse(data) {
  const required = ['ok', 'rewrites', 'persuasion_warnings', 'phase'];
  const missing = required.filter(k => !(k in data));
  if (missing.length) console.warn('[parseRewritesResponse] Missing fields:', missing, data);
  if ('rewrites' in data && !Array.isArray(data.rewrites)) {
    console.warn('[parseRewritesResponse] rewrites should be an array:', data.rewrites);
  }
  return data;
}

/** Validate POST /api/message and POST /api/action responses. */
function parseMessageResponse(data) {
  if (!data.ok && !data.error) {
    console.warn('[parseMessageResponse] Response has neither ok nor error:', data);
  }
  return data;
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  parseStatusResponse,
  parseSessionListResponse,
  parseRewritesResponse,
  parseMessageResponse,
};
