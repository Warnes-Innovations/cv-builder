/**
 * web/src/main.js — esbuild entry point for the modules bundle.
 *
 * Bundles utils, api-client, and state-manager as proper ES modules and
 * assigns every export to `window` so that the Phase-2 legacy global scripts
 * (app.js, ui-core.js, layout-instruction.js) can call these functions and
 * reference these constants as bare identifiers without any changes.
 *
 * Build:  npm run build          → web/modules.js (development, unminified)
 *         npm run build:prod     → web/modules.js (minified)
 *         npm run build:watch    → rebuild on every source change
 *
 * Phase 2 (future): convert app.js, ui-core.js, layout-instruction.js to ES
 * modules, import them here, and collapse all <script> tags to one bundle.
 */

import * as Utils      from '../utils.js';
import * as ApiClient  from '../api-client.js';
import * as State      from '../state-manager.js';

// Expose every export to the global scope so legacy scripts loaded AFTER
// modules.js can call e.g. escapeHtml(), PHASES.INIT, apiFetch(), etc.
// In a browser, globalThis === window, so bare function calls resolve here.
Object.assign(globalThis, Utils, ApiClient, State);
