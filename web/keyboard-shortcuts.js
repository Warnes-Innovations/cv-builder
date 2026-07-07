// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/keyboard-shortcuts.js — Global keyboard shortcuts for workflow navigation.
 *
 * Shortcuts implemented:
 *   Ctrl+Enter       Trigger the primary action button on the current tab
 *   Ctrl+Shift+R     Re-run the current workflow phase (calls confirmReRunPhase)
 *   A                Accept the focused review card (rewrite / spell-check tabs)
 *   R                Reject the focused review card (rewrite / spell-check tabs)
 *   ↑ / ↓            Navigate between review cards on review tabs
 *   ?                Toggle keyboard shortcut help panel
 */

/** Track which card is keyboard-focused on the current review tab. */
let _focusedCardIndex = -1;

/** Returns true if focus is inside a text input, so A/R/↑/↓ should not fire. */
function _inTextInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Returns true if any modal overlay is currently visible. */
function _modalOpen() {
  return document.querySelector('[role="dialog"]:not([style*="display: none"]):not([style*="display:none"])') !== null;
}

/**
 * Map tab IDs to their primary action button IDs.
 * Buttons that might be disabled at runtime are still clicked — the button's
 * own disabled check prevents accidental submission.
 */
const _TAB_ACTION_BTN = {
  'job':                   'send-btn',
  'analysis':              'analyze-btn',
  'goals':                 'recommend-btn',
  'rewrite':               'rewrite-btn',
  'spell':                 'spell-btn',
  'final_generate':        'generate-btn',
  'layout':                'layout-btn',
  'download':              'final-generate-proceed-btn',
  'finalise':              'finalise-action-btn',
};

/** Click the primary action button for the current tab (Ctrl+Enter). */
function _triggerPrimaryAction() {
  const tab = typeof stateManager !== 'undefined' ? stateManager.getCurrentTab() : null;
  if (!tab) return;
  const btnId = _TAB_ACTION_BTN[tab];
  if (!btnId) return;
  const btn = document.getElementById(btnId);
  if (btn && !btn.disabled) btn.click();
}

// ── Card navigation helpers ───────────────────────────────────────────────────

/** Return visible review cards for the current tab (GAP-324: extended to DataTable review rows). */
function _getCards() {
  const tab = typeof stateManager !== 'undefined' ? stateManager.getCurrentTab() : null;
  if (tab === 'rewrite') return [...document.querySelectorAll('.rewrite-card')];
  if (tab === 'spell')   return [...document.querySelectorAll('.spell-card')];
  // DataTable review sub-tabs (Experiences, Skills, Achievements, Publications) — use visible rows.
  if (tab === 'customizations') {
    const pane = window._activeReviewPane;
    if (pane === 'experience')   return [...document.querySelectorAll('#experience-review-table tbody tr[data-exp-id]')].filter(r => r.style.display !== 'none');
    if (pane === 'skills')       return [...document.querySelectorAll('#skills-review-table tbody tr[data-skill]')].filter(r => r.style.display !== 'none');
    if (pane === 'achievements') return [...document.querySelectorAll('#achievements-review-table tbody tr[data-ach-id]')].filter(r => r.style.display !== 'none');
    // Publications sub-tab: A/R toggles include/exclude (GAP-332)
    if (pane === 'publications') return [...document.querySelectorAll('#publications-review-table tbody tr[data-cite-key]:not(.pub-divider-row)')].filter(r => r.style.display !== 'none');
  }
  return [];
}

/** Return the row type for the current active review pane. */
function _getReviewPaneType() {
  const pane = window._activeReviewPane;
  if (pane === 'experience')   return 'experience';
  if (pane === 'skills')       return 'skill';
  return null;
}

/** Visually highlight a card as keyboard-focused. */
function _highlightCard(cards, idx) {
  cards.forEach((c, i) => {
    if (i === idx) {
      c.classList.add('kb-focused');
      c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      c.classList.remove('kb-focused');
    }
  });
}

/** Move the keyboard focus to card at delta offset from current. */
function _moveCardFocus(delta) {
  const cards = _getCards();
  if (!cards.length) return;
  _focusedCardIndex = Math.max(0, Math.min(cards.length - 1, _focusedCardIndex + delta));
  _highlightCard(cards, _focusedCardIndex);
}

/** Accept the currently keyboard-focused rewrite card. */
function _acceptFocusedCard() {
  const tab = typeof stateManager !== 'undefined' ? stateManager.getCurrentTab() : null;
  if (tab === 'rewrite') {
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    const card = cards[_focusedCardIndex];
    const id = card.id.replace('rw-card-', '');
    if (typeof applyRewriteAction === 'function') applyRewriteAction(id, 'accept');
  } else if (tab === 'spell') {
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    // spell cards: find the accept button within the focused card
    const btn = cards[_focusedCardIndex].querySelector('[data-action="keep"], .spell-keep-btn');
    if (btn) btn.click();
  } else if (tab === 'customizations') {
    // DataTable review rows: A = include (GAP-324, GAP-332)
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    const row = cards[_focusedCardIndex];
    const pane = window._activeReviewPane;
    if (pane === 'experience') {
      const id = row.dataset.expId;
      if (id && typeof handleActionClick === 'function') handleActionClick(id, 'include', 'experience');
    } else if (pane === 'skills') {
      const id = row.dataset.skill;
      if (id && typeof handleActionClick === 'function') handleActionClick(id, 'include', 'skill');
    } else if (pane === 'publications') {
      const citeKey = row.dataset.citeKey;
      if (citeKey && typeof handlePubAction === 'function') handlePubAction(citeKey, true);
    } else {
      // Achievements: click the include/accept button if present
      const btn = row.querySelector('[data-action="include"], .ach-include-btn');
      if (btn) btn.click();
    }
  }
}

/** Reject the currently keyboard-focused review card. */
function _rejectFocusedCard() {
  const tab = typeof stateManager !== 'undefined' ? stateManager.getCurrentTab() : null;
  if (tab === 'rewrite') {
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    const card = cards[_focusedCardIndex];
    const id = card.id.replace('rw-card-', '');
    if (typeof applyRewriteAction === 'function') applyRewriteAction(id, 'reject');
  } else if (tab === 'spell') {
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    const btn = cards[_focusedCardIndex].querySelector('[data-action="apply"], .spell-apply-btn');
    if (btn) btn.click();
  } else if (tab === 'customizations') {
    // DataTable review rows: R = exclude (GAP-324, GAP-332)
    const cards = _getCards();
    if (_focusedCardIndex < 0 || _focusedCardIndex >= cards.length) return;
    const row = cards[_focusedCardIndex];
    const pane = window._activeReviewPane;
    if (pane === 'experience') {
      const id = row.dataset.expId;
      if (id && typeof handleActionClick === 'function') handleActionClick(id, 'exclude', 'experience');
    } else if (pane === 'skills') {
      const id = row.dataset.skill;
      if (id && typeof handleActionClick === 'function') handleActionClick(id, 'exclude', 'skill');
    } else if (pane === 'publications') {
      const citeKey = row.dataset.citeKey;
      if (citeKey && typeof handlePubAction === 'function') handlePubAction(citeKey, false);
    } else {
      // Achievements: click the exclude button if present
      const btn = row.querySelector('[data-action="exclude"], .ach-exclude-btn');
      if (btn) btn.click();
    }
  }
}

// ── Shortcut help panel ───────────────────────────────────────────────────────

const _PANEL_ID = 'kb-shortcuts-panel';

/** Toggle the keyboard shortcut help panel. */
export function showKeyboardShortcutsPanel() {
  const existing = document.getElementById(_PANEL_ID);
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = _PANEL_ID;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Keyboard shortcuts');
  panel.innerHTML = `
    <div id="kb-shortcuts-inner">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>Keyboard Shortcuts</strong>
        <button id="kb-shortcuts-close" aria-label="Close keyboard shortcuts" style="background:none;border:none;font-size:1.2em;cursor:pointer;padding:2px 6px">✕</button>
      </div>
      <table style="border-collapse:collapse;width:100%">
        <tbody>
          <tr><td style="padding:4px 12px 4px 0"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>Trigger primary action on current step</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd></td><td>Re-run current workflow phase</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate between review cards / table rows</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>A</kbd></td><td>Accept / include focused item (rewrite, spell, or customise review row)</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>R</kbd></td><td>Reject / exclude focused item (rewrite, spell, or customise review row)</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>?</kbd></td><td>Toggle this help panel</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>Esc</kbd></td><td>Close modals / this panel</td></tr>
        </tbody>
      </table>
    </div>`;
  Object.assign(panel.style, {
    position:   'fixed',
    bottom:     '80px',
    right:      '24px',
    background: '#1f2937',
    color:      '#f9fafb',
    border:     '1px solid #374151',
    borderRadius: '8px',
    padding:    '16px 20px',
    zIndex:     '10000',
    fontSize:   '0.85em',
    minWidth:   '340px',
    boxShadow:  '0 4px 20px rgba(0,0,0,0.5)',
  });
  document.body.appendChild(panel);
  panel.querySelector('#kb-shortcuts-close').addEventListener('click', () => panel.remove());
}

// ── Reset card focus when tab changes ────────────────────────────────────────

/** Called whenever the active tab changes so card focus resets. */
export function resetCardFocus() {
  _focusedCardIndex = -1;
  document.querySelectorAll('.kb-focused').forEach(el => el.classList.remove('kb-focused'));
}

// ── Global keydown handler ───────────────────────────────────────────────────

function _onKeyDown(e) {
  // Ctrl+Enter → primary action (always, even in text inputs when the main
  // send-box is focused, to match the existing Enter behaviour there).
  if (e.ctrlKey && e.key === 'Enter') {
    _triggerPrimaryAction();
    return;
  }

  // Ctrl+Shift+R → re-run current phase
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    const activeEl = document.querySelector('[id^="step-"].active');
    const step = activeEl ? activeEl.id.replace('step-', '') : null;
    if (step && typeof confirmReRunPhase === 'function') {
      e.preventDefault();
      confirmReRunPhase(step);
    }
    return;
  }

  // All single-key shortcuts are suppressed when typing into an input.
  if (_inTextInput()) return;
  // All single-key shortcuts are suppressed when a modal dialog is open,
  // except Escape (handled by ui-core.js).
  if (_modalOpen()) return;

  switch (e.key) {
    case '?':
      e.preventDefault();
      showKeyboardShortcutsPanel();
      break;
    case 'ArrowUp':
      e.preventDefault();
      _moveCardFocus(-1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      _moveCardFocus(1);
      break;
    case 'a':
    case 'A':
      _acceptFocusedCard();
      break;
    case 'r':
    case 'R':
      _rejectFocusedCard();
      break;
    default:
      break;
  }
}

// ── Initialisation ────────────────────────────────────────────────────────────

/**
 * Attach the global keyboard-shortcut listener.
 * Called once from app.js after DOMContentLoaded.
 */
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', _onKeyDown);
}
