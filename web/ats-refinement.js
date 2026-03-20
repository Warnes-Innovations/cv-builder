/**
 * web/ats-refinement.js
 * ATS score badge display and debounced refresh scheduling.
 *
 * DEPENDENCIES:
 *   - stateManager from state-manager.js (on globalThis)
 */

function updateAtsBadge(score) {
  const badge   = document.getElementById('ats-score-badge');
  const valueEl = document.getElementById('ats-score-value');
  if (!badge || !valueEl) return;

  if (!score || typeof score.overall !== 'number') {
    badge.style.display = 'none';
    return;
  }

  const overall = Math.round(score.overall);
  valueEl.textContent = `${overall}%`;
  badge.style.display = 'flex';

  badge.classList.remove('score-high', 'score-medium', 'score-low');
  if (overall >= 75) {
    badge.classList.add('score-high');
  } else if (overall >= 50) {
    badge.classList.add('score-medium');
  } else {
    badge.classList.add('score-low');
  }

  badge.setAttribute('aria-label', `ATS match score: ${overall}% (${score.basis || 'review'})`);
}

/**
 * Fetch ATS score from backend and update badge + stateManager.
 * Safe to call at any phase — does nothing when no session/analysis available.
 *
 * @param {string} [basis]  "analysis" | "review_checkpoint" | "post_generation"
 */
async function refreshAtsScore(basis = 'review_checkpoint') {
  const sessionId = stateManager.getSessionId();
  if (!sessionId) return;
  try {
    const res = await fetch('/api/cv/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, basis }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && data.ats_score) {
      stateManager.setAtsScore(data.ats_score);
      updateAtsBadge(data.ats_score);
    }
  } catch (_e) {
    // Non-fatal — badge stays hidden or shows stale value
  }
}

/** Debounced: defers refresh 600ms after the last call. */
let _atsRefreshTimer = null;
function scheduleAtsRefresh(basis = 'review_checkpoint') {
  clearTimeout(_atsRefreshTimer);
  _atsRefreshTimer = setTimeout(() => refreshAtsScore(basis), 600);
}

// ── ES module exports ──────────────────────────────────────────────────────
export { updateAtsBadge, refreshAtsScore, scheduleAtsRefresh };
