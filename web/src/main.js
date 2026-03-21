/**
 * web/src/main.js — esbuild entry point for the full browser bundle.
 *
 * Phase 2: bundles utils, api-client, state-manager, ui-core, and
 * layout-instruction into a single IIFE (web/bundle.js). Every export is
 * assigned to `window` so that app.js (still a plain legacy script loaded
 * after the bundle) can call all helpers as bare global identifiers.
 *
 * Build:  npm run build          → web/bundle.js (development, unminified)
 *         npm run build:prod     → web/bundle.js (minified)
 *         npm run build:watch    → rebuild on every source change
 *
 * Phase 3 (future): convert app.js to an ES module, import it here, and
 * collapse all remaining <script> tags into this single bundle.
 */

import * as Utils             from '../utils.js';
import * as ApiClient         from '../api-client.js';
import * as State             from '../state-manager.js';
import * as UiCore            from '../ui-core.js';
import * as LayoutInstruction from '../layout-instruction.js';

// Expose every export to the global scope so app.js (loaded as a plain
// <script> tag after this bundle) can call e.g. confirmDialog(),
// initiateLayoutInstructions(), PHASES.INIT, stateManager, etc.
Object.assign(globalThis, Utils, ApiClient, State, UiCore, LayoutInstruction);
