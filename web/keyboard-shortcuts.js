// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/keyboard-shortcuts.js — Global keyboard shortcuts for workflow navigation.
 *
 * Shortcuts implemented:
 *   Ctrl+Enter   Trigger the primary action button on the current tab
 *   A            Accept the focused review card (rewrite / spell-check tabs)
 *   R            Reject the focused review card (rewrite / spell-check tabs)
 *   ↑ / ↓        Navigate between review cards on review tabs
 *   ?            Toggle keyboard shortcut help panel
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

/** Return visible review cards for the current tab. */
function _getCards() {
  const tab = typeof stateManager !== 'undefined' ? stateManager.getCurrentTab() : null;
  if (tab === 'rewrite') return [...document.querySelectorAll('.rewrite-card')];
  if (tab === 'spell')   return [...document.querySelectorAll('.spell-card')];
  return [];
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
          <tr><td style="padding:4px 12px 4px 0"><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate between review cards</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>A</kbd></td><td>Accept focused card (rewrite / spell)</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><kbd>R</kbd></td><td>Reject focused card (rewrite / spell)</td></tr>
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
