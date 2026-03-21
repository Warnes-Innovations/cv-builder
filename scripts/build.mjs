// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * scripts/build.mjs — esbuild bundler for cv-builder web assets.
 *
 * Bundles web/src/main.js (utils + api-client + state-manager + ui-core +
 * layout-instruction) into web/bundle.js using an IIFE wrapper so that all
 * exports are assigned to `window` and remain accessible to app.js (still a
 * plain legacy script in Phase 2).
 *
 * Usage:
 *   node scripts/build.mjs            # development build (unminified)
 *   node scripts/build.mjs --prod     # production build (minified)
 *   node scripts/build.mjs --watch    # rebuild on source changes
 *   node scripts/build.mjs --sourcemap # inline source maps
 */

import esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args      = new Set(process.argv.slice(2));
const isProd    = args.has('--prod');
const isWatch   = args.has('--watch');
const sourcemap = args.has('--sourcemap') || !isProd;

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: [resolve(root, 'web/src/main.js')],
  bundle:      true,
  outfile:     resolve(root, 'web/bundle.js'),
  format:      'iife',   // wraps in (function(){ … })() — safe for <script> tags
  target:      ['es2020'],
  minify:      isProd,
  sourcemap:   sourcemap ? 'inline' : false,
  banner: {
    js: '/* cv-builder bundle — built by esbuild, do not edit directly */',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  const kb = '(watching)';
  console.log(`⏳ esbuild watching web/src/main.js → web/bundle.js`);
} else {
  const result = await esbuild.build({ ...config, metafile: true });
  const kb = (
    Object.values(result.metafile.outputs)[0].bytes / 1024
  ).toFixed(1);
  console.log(`✓ web/bundle.js  ${kb} KB${isProd ? '  (minified)' : ''}`);
}
