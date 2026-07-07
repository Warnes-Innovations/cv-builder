// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * Shared proposal-review row renderer, extracted from web/harvest.js so the
 * GAP-01 "Update via AI" panel (web/master-data-ai-update.js) doesn't
 * duplicate or fork the same before/after diff-row UI a third time.
 *
 * Row markup uses `data-toggle-reasoning="ID"` attributes instead of inline
 * `onclick="..."` handlers — the caller attaches ONE delegated click
 * listener (attachProposalRowListeners) rather than each row wiring its own
 * inline handler. This matters because harvest.js's original inline-onclick
 * version called harvest.js-specific global functions directly; a row
 * rendered by a different module (master-data-ai-update.js) must not
 * silently reference functions that don't exist there.
 *
 * `idPrefix` keeps each caller's existing DOM-id convention intact (e.g.
 * harvest.js's `harvest-row-*`/`harvest-chk-*`, referenced elsewhere in that
 * file, notably applyHarvestSelections) rather than forcing a rename.
 *
 * Public exports:
 *   esc(str)
 *   renderProposalRow(item, opts)
 *   attachProposalRowListeners(containerEl, idPrefix, handlers)
 */

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render one proposal-review row (checkbox + before/after + optional
 * collapsible detail + optional badges/flag banner).
 *
 * @param {object} item
 * @param {string} item.id
 * @param {string} item.typeLabel     - small caps label above the row (e.g. section name)
 * @param {string} [item.sourceBadgeHtml]
 * @param {string} item.label         - secondary summary line
 * @param {string} [item.original]    - "Before" block text (omit for add-only proposals)
 * @param {string} [item.proposed]    - "After" block text (already display-ready, not a raw object)
 * @param {string} [item.detailText]  - collapsible detail (harvest: reasoning; GAP-01: rationale)
 * @param {string} [item.badgesHtml]  - pre-rendered right-side badge HTML (caller-specific)
 * @param {string} [item.flagHtml]    - pre-rendered advisory/warning banner (e.g. possible-duplicate, stale)
 * @param {boolean} [item.checked]
 * @param {object} opts
 * @param {string} opts.idPrefix          - shared prefix for row/reason/checkbox ids, e.g. 'harvest' or 'mdu'
 * @param {string} [opts.checkboxDataAttr] - kebab-case data-attribute suffix, e.g. 'harvest-id' or 'mdu-id'
 *   (NOT camelCase — this is interpolated verbatim into `data-${checkboxDataAttr}` in the HTML string;
 *   a camelCase value like 'harvestId' produces the literal attribute `data-harvestId`, which the HTML
 *   parser lowercases to `data-harvestid` on insertion, silently breaking `.dataset.harvestId` /
 *   `[data-harvest-id]` lookups elsewhere. This bit master-data-ai-update.js's own first draft.)
 * @param {string} [opts.ariaLabelSuffix]  - appended to the checkbox's aria-label after `label` (e.g. duplicate/flag text)
 */
export function renderProposalRow(item, opts = {}) {
  const {
    idPrefix = 'proposal',
    checkboxDataAttr = 'proposal-id',
    ariaLabelSuffix = '',
  } = opts;

  const checked = item.checked ? ' checked' : '';
  const rowId = `${idPrefix}-row-${esc(item.id)}`;
  const reasonId = `${idPrefix}-reason-${esc(item.id)}`;
  const checkboxId = `${idPrefix}-chk-${esc(item.id)}`;
  const ariaLabel = esc(`${item.label || ''}${ariaLabelSuffix}`);

  const hasDetail = Boolean(item.detailText);
  const detailToggle = hasDetail
    ? `<button type="button" data-toggle-reasoning="${esc(item.id)}" aria-expanded="false" aria-controls="${reasonId}" style="font-size:0.75em;background:none;border:none;color:var(--cv-gray-500);cursor:pointer;padding:0 4px;vertical-align:middle;" title="Toggle details">💬</button>`
    : '';
  const detailBlock = hasDetail
    ? `<div id="${reasonId}" style="display:none;margin-top:6px;padding:8px 10px;background:var(--cv-bg-light);border-left:3px solid var(--cv-slate-400);border-radius:4px;font-size:0.82em;color:var(--cv-text-muted);line-height:1.5;">${esc(item.detailText)}</div>`
    : '';

  return `
    <tr id="${rowId}" style="border-bottom:1px solid var(--cv-bg-subtle);">
      <td style="padding:10px 12px;width:36px;vertical-align:top;">
        <input type="checkbox" id="${checkboxId}" data-${checkboxDataAttr}="${esc(item.id)}"${checked}
          aria-label="${ariaLabel}"
          style="width:16px;height:16px;cursor:pointer;margin-top:2px;">
      </td>
      <td style="padding:10px 12px;">
        <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="font-size:0.78em;font-weight:600;color:var(--cv-text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">
              ${esc(item.typeLabel || '')}${item.sourceBadgeHtml || ''}
            </div>
            <div style="font-size:0.87em;color:var(--cv-slate-400);margin-bottom:6px;">${esc(item.label || '')}</div>
            ${item.flagHtml || ''}
            ${item.original ? `
            <div style="margin-bottom:6px;">
              <div style="font-size:0.72em;font-weight:600;color:var(--cv-gray-500);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:2px;">Before</div>
              <div style="font-size:0.85em;color:var(--cv-gray-500);background:var(--cv-bg-light);border-radius:4px;padding:6px 8px;border-left:3px solid var(--cv-gray-300);line-height:1.5;">${esc(item.original)}</div>
            </div>` : ''}
            ${item.proposed ? `
            <div style="margin-bottom:4px;">
              <div style="font-size:0.72em;font-weight:600;color:var(--cv-gray-500);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:2px;">After</div>
              <div style="font-size:0.85em;color:var(--cv-text-primary);background:var(--cv-success-bg);border-radius:4px;padding:6px 8px;border-left:3px solid var(--cv-success-border);line-height:1.5;">${esc(item.proposed)}</div>
            </div>` : ''}
            ${detailBlock}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0;">
            ${item.badgesHtml || ''}
            ${detailToggle}
          </div>
        </div>
      </td>
    </tr>`;
}

/**
 * Attach one delegated click listener to `containerEl` covering every
 * `[data-toggle-reasoning]` element rendered by renderProposalRow with the
 * matching `idPrefix`. Guards against double-attaching across repeated
 * calls (e.g. a tab being re-populated) via a marker on `containerEl`.
 */
export function attachProposalRowListeners(containerEl, idPrefix, handlers = {}) {
  if (!containerEl) return;
  const guardKey = `proposalListenersAttached_${idPrefix}`;
  if (containerEl.dataset[guardKey]) return;
  containerEl.dataset[guardKey] = '1';

  containerEl.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle-reasoning]');
    if (!toggle) return;
    const id = toggle.dataset.toggleReasoning;
    const reasonEl = document.getElementById(`${idPrefix}-reason-${id}`);
    if (reasonEl) {
      const nowVisible = reasonEl.style.display === 'none';
      reasonEl.style.display = nowVisible ? 'block' : 'none';
      toggle.setAttribute('aria-expanded', String(nowVisible));
    }
    if (typeof handlers.onToggleReasoning === 'function') handlers.onToggleReasoning(id);
  });
}
