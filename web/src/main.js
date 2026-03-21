/**
 * web/src/main.js — esbuild entry point for the full browser bundle.
 *
 * Phase 2 modules: utils, api-client, state-manager, ui-core, layout-instruction
 * Phase 3 modules: all domain split modules (Tier 0–7) from the app.js modularisation.
 *
 * Every export is assigned to `window` so that legacy inline onclick="fn()"
 * handlers and app.js continue to work unchanged.
 *
 * Build:  npm run build          → web/bundle.js (development, unminified)
 *         npm run build:prod     → web/bundle.js (minified)
 *         npm run build:watch    → rebuild on every source change
 */

// ── Phase 2 (original bundle) ─────────────────────────────────────────────────
import * as Utils             from '../utils.js';
import * as ApiClient         from '../api-client.js';
import * as State             from '../state-manager.js';
import * as UiCore            from '../ui-core.js';
import * as LayoutInstruction from '../layout-instruction.js';

// ── Tier 0 — no dependencies ──────────────────────────────────────────────────
import * as Validators            from '../validators.js';
import * as RecommendationHelpers from '../recommendation-helpers.js';
import * as UiHelpers             from '../ui-helpers.js';

// ── Tier 1 ────────────────────────────────────────────────────────────────────
import * as FetchUtils   from '../fetch-utils.js';
import * as MessageQueue from '../message-queue.js';

// ── Tier 2 ────────────────────────────────────────────────────────────────────
import * as AuthProvider   from '../auth-provider.js';
import * as AtsRefinement  from '../ats-refinement.js';
import * as SessionActions from '../session-actions.js';
import * as JobAnalysis    from '../job-analysis.js';

// ── Tier 3 ────────────────────────────────────────────────────────────────────
import * as SessionManager  from '../session-manager.js';
import * as JobInput        from '../job-input.js';
import * as MessageDispatch from '../message-dispatch.js';
import * as QuestionsPanel  from '../questions-panel.js';

// ── Tier 4 ────────────────────────────────────────────────────────────────────
import * as ReviewTableBase from '../review-table-base.js';

// ── Tier 5 ────────────────────────────────────────────────────────────────────
import * as ExperienceReview   from '../experience-review.js';
import * as SkillsReview       from '../skills-review.js';
import * as AchievementsReview from '../achievements-review.js';
import * as SummaryReview      from '../summary-review.js';
import * as PublicationsReview from '../publications-review.js';

// ── Tier 6 ────────────────────────────────────────────────────────────────────
import * as RewriteReview      from '../rewrite-review.js';
import * as SpellCheck         from '../spell-check.js';
import * as WorkflowSteps      from '../workflow-steps.js';
import * as MasterCv           from '../master-cv.js';
import * as CoverLetter        from '../cover-letter.js';
import * as ScreeningQuestions from '../screening-questions.js';
import * as Finalise           from '../finalise.js';

// ── Tier 7 ────────────────────────────────────────────────────────────────────
import * as SessionSwitcherUi from '../session-switcher-ui.js';

// ── Assign all exports to globalThis ─────────────────────────────────────────
// Phase 2 modules first; phase 3 domain modules follow so fully-featured
// implementations override any placeholder stubs (e.g. showSessionConflictBanner
// in session-switcher-ui overrides the simple stub in ui-core).
Object.assign(globalThis,
  Utils, ApiClient, State, UiCore, LayoutInstruction,
  Validators, RecommendationHelpers, UiHelpers,
  FetchUtils, MessageQueue,
  AuthProvider, AtsRefinement, SessionActions, JobAnalysis,
  SessionManager, JobInput, MessageDispatch, QuestionsPanel,
  ReviewTableBase,
  ExperienceReview, SkillsReview, AchievementsReview, SummaryReview, PublicationsReview,
  RewriteReview, SpellCheck, WorkflowSteps, MasterCv,
  CoverLetter, ScreeningQuestions, Finalise,
  SessionSwitcherUi,
);
