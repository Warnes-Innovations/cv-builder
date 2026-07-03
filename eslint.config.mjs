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
];
