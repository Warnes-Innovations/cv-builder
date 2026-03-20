/**
 * scripts/build.mjs — esbuild bundler for cv-builder web assets.
 *
 * Bundles web/src/main.js (utils + api-client + state-manager) into
 * web/modules.js using an IIFE wrapper so that all exports are assigned
 * to `window` and remain accessible to the Phase-2 legacy global scripts.
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
  outfile:     resolve(root, 'web/modules.js'),
  format:      'iife',   // wraps in (function(){ … })() — safe for <script> tags
  target:      ['es2020'],
  minify:      isProd,
  sourcemap:   sourcemap ? 'inline' : false,
  banner: {
    js: '/* cv-builder modules — built by esbuild, do not edit directly */',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  const kb = '(watching)';
  console.log(`⏳ esbuild watching web/src/main.js → web/modules.js`);
} else {
  const result = await esbuild.build({ ...config, metafile: true });
  const kb = (
    Object.values(result.metafile.outputs)[0].bytes / 1024
  ).toFixed(1);
  console.log(`✓ web/modules.js  ${kb} KB${isProd ? '  (minified)' : ''}`);
}
