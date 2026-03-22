// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/logger.js
 * Centralised logging using the loglevel library.
 *
 * Usage (per-module named loggers):
 *   import { getLogger } from './logger.js';
 *   const log = getLogger('api-client');
 *   log.info('request started', endpoint);
 *   log.warn('session conflict');
 *   log.error('fatal', error);
 *
 * Root logger (unchanged global level):
 *   import log from './logger.js';
 *   log.setLevel('debug');   // lower the global minimum
 *
 * The default level is 'warn' in production builds (NODE_ENV=production) and
 * 'debug' in development.  Individual module levels can be overridden at
 * runtime via the browser console:
 *   loglevel.getLogger('api-client').setLevel('trace');
 *
 * DEPENDENCIES: loglevel (npm)
 */

import loglevel from 'loglevel';

// Default level: debug in dev, warn in prod.
const DEFAULT_LEVEL = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production')
  ? 'warn'
  : 'debug';

loglevel.setDefaultLevel(DEFAULT_LEVEL);

/**
 * Get (or create) a named child logger.
 * Named loggers inherit the root default level but can be tuned independently.
 *
 * @param {string} name - Module name, e.g. 'api-client'
 * @returns {import('loglevel').Logger}
 */
export function getLogger(name) {
  return loglevel.getLogger(name);
}

// Expose root loglevel instance on globalThis so the browser console can
// adjust levels at runtime without a build step:
//   loglevel.setLevel('debug');
//   loglevel.getLogger('api-client').setLevel('trace');
if (typeof globalThis !== 'undefined') {
  globalThis.loglevel = loglevel;
}

export default loglevel;
