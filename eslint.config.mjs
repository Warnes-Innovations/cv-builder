// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

// Narrow, duplication-focused ESLint config — deliberately does NOT enable
// eslint-plugin-sonarjs's full `recommended` preset (268 rules covering
// cognitive complexity, security, testing conventions, etc.), which would
// flood this codebase with unrelated findings. Only the rules that flag
// copy-pasted logic that should be generalized into a shared function are
// enabled; see AGENTS.md / .github/copilot-instructions.md, "Avoid
// Duplicate Helper/Function Definitions Across Files".

import sonarjs from 'eslint-plugin-sonarjs';

export default [
  // Global ignore — must be its own entry (an object with only `ignores`)
  // so bundle.js is excluded even when a file glob is passed on the CLI.
  { ignores: ['web/bundle.js'] },
  {
    files: ['web/*.js', 'web/src/**/*.js'],
    linterOptions: {
      // Keep output scoped to duplication findings only — don't also flag
      // pre-existing eslint-disable comments left over from unrelated,
      // no-longer-configured rules.
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: { sonarjs },
    rules: {
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
    },
  },
  // GAP-16 Part B mutation-boundary guard: early-preview-panel.js must only
  // ever call the read-only GET /api/layout-html endpoint. Calling either
  // mutating endpoint here would silently fast-forward the user's workflow
  // phase (see the module's own header comment) — fail CI, don't just rely
  // on a unit test that could later be weakened or deleted unnoticed.
  {
    files: ['web/early-preview-panel.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value='/api/cv/generate-preview']",
          message: 'early-preview-panel.js must not call the mutating /api/cv/generate-preview endpoint — see the module header comment.',
        },
        {
          selector: "Literal[value='/api/cv/smart-instruction']",
          message: 'early-preview-panel.js must not call the mutating /api/cv/smart-instruction endpoint — see the module header comment.',
        },
      ],
    },
  },
];
