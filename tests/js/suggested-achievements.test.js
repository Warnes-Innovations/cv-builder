/**
 * Unit tests for AI-suggested achievement helpers:
 *   saveSuggestedAchievementField
 *   moveSuggestedAchievementRow
 *   deleteSuggestedAchievement
 *   _suggestedAchsOrdered reset on loadSessionFile
 */

let saveSuggestedAchievementField, moveSuggestedAchievementRow, deleteSuggestedAchievement

describe('suggested achievement helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    const app = require('../../web/app.js')
    saveSuggestedAchievementField = app.saveSuggestedAchievementField
    moveSuggestedAchievementRow   = app.moveSuggestedAchievementRow
    deleteSuggestedAchievement    = app.deleteSuggestedAchievement
    // Seed a small ordered list with stable IDs
    window._suggestedAchsOrdered = [
      { _suggId: 'sugg::0', title: 'Alpha', description: 'Desc A' },
      { _suggId: 'sugg::1', title: 'Beta',  description: 'Desc B' },
      { _suggId: 'sugg::2', title: 'Gamma', description: 'Desc C' },
    ];
    window.achievementDecisions = {
      'sugg::0': 'include',
      'sugg::1': 'include',
      'sugg::2': 'include',
    };
    // Stub _renderAchievementsReviewTable so it doesn't need a real DOM
    window._renderAchievementsReviewTable = vi.fn();
    // Stub confirmDialog to auto-confirm
    window.confirmDialog = vi.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window._suggestedAchsOrdered;
    delete window.achievementDecisions;
    delete window._renderAchievementsReviewTable;
    delete window.confirmDialog;
  });

  // ── saveSuggestedAchievementField ────────────────────────────────────────

  describe('saveSuggestedAchievementField', () => {
    test('updates title on matching suggestion', () => {
      saveSuggestedAchievementField('sugg::1', 'title', 'Updated Beta');
      expect(window._suggestedAchsOrdered[1].title).toBe('Updated Beta');
    });

    test('updates description on matching suggestion', () => {
      saveSuggestedAchievementField('sugg::0', 'description', 'New Desc');
      expect(window._suggestedAchsOrdered[0].description).toBe('New Desc');
    });

    test('does nothing for unknown suggId', () => {
      saveSuggestedAchievementField('sugg::99', 'title', 'Ghost');
      // Array unchanged
      expect(window._suggestedAchsOrdered.map(s => s.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
    });
  });

  // ── moveSuggestedAchievementRow ──────────────────────────────────────────

  describe('moveSuggestedAchievementRow', () => {
    test('moves item down by 1', () => {
      moveSuggestedAchievementRow('sugg::0', 1);
      expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::1', 'sugg::0', 'sugg::2']);
    });

    test('moves item up by 1', () => {
      moveSuggestedAchievementRow('sugg::2', -1);
      expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::0', 'sugg::2', 'sugg::1']);
    });

    test('clamps at top — does not move first item up', () => {
      moveSuggestedAchievementRow('sugg::0', -1);
      expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::0', 'sugg::1', 'sugg::2']);
    });

    test('clamps at bottom — does not move last item down', () => {
      moveSuggestedAchievementRow('sugg::2', 1);
      expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::0', 'sugg::1', 'sugg::2']);
    });

    test('stable IDs are preserved after move — no remapping', () => {
      moveSuggestedAchievementRow('sugg::1', -1);
      const ids = window._suggestedAchsOrdered.map(s => s._suggId);
      expect(ids).toEqual(['sugg::1', 'sugg::0', 'sugg::2']);
      // Each item still carries its own stable ID
      window._suggestedAchsOrdered.forEach(s => {
        expect(s._suggId).toMatch(/^sugg::\d+$/);
      });
    });

    test('does not throw when re-rendering after move', () => {
      // _renderAchievementsReviewTable is module-private; verify no exception is thrown
      expect(() => moveSuggestedAchievementRow('sugg::0', 1)).not.toThrow();
    });
  });

  // ── deleteSuggestedAchievement ───────────────────────────────────────────

  describe('deleteSuggestedAchievement', () => {
    test('removes the item from _suggestedAchsOrdered', async () => {
      await deleteSuggestedAchievement('sugg::1');
      expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::0', 'sugg::2']);
    });

    test('removes the decision key', async () => {
      await deleteSuggestedAchievement('sugg::1');
      expect('sugg::1' in window.achievementDecisions).toBe(false);
    });

    test('other decision keys are untouched', async () => {
      await deleteSuggestedAchievement('sugg::1');
      expect(window.achievementDecisions['sugg::0']).toBe('include');
      expect(window.achievementDecisions['sugg::2']).toBe('include');
    });

    test('does not throw when re-rendering after delete', async () => {
      // _renderAchievementsReviewTable is module-private; verify no exception is thrown
      await expect(deleteSuggestedAchievement('sugg::0')).resolves.not.toThrow();
    });

    test('does nothing when confirmDialog returns false', async () => {
      window.confirmDialog.mockResolvedValue(false);
      await deleteSuggestedAchievement('sugg::0');
      expect(window._suggestedAchsOrdered).toHaveLength(3);
      expect(window._renderAchievementsReviewTable).not.toHaveBeenCalled();
    });
  });
});
