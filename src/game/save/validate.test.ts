/**
 * Save validation.
 *
 * Everything in storage is untrusted — a player can edit it by hand — so these
 * cover the four states a file can be in (valid, corrupted, missing fields,
 * wrong version) plus the hostile shapes a hand-edited file can take.
 */
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../state/initial';
import { applySave } from './apply';
import { encodeSave, toSaveFile } from './serialize';
import { decodeSave } from './validate';
import { SAVE_VERSION } from './types';

const validState = () => {
  const base = createInitialGameState(1);
  return {
    ...base,
    player: {
      ...base.player,
      level: 4,
      xp: 1200,
      credits: 900,
      reputation: 21,
      unlockedToolIds: ['basic-scanner', 'decoder'],
      completedMissionIds: ['first-connection', 'open-ports'],
      achievementIds: ['first-contract'],
      statistics: {
        commandsExecuted: 120,
        missionsAttempted: 4,
        missionsCompleted: 2,
        missionsFailed: 1,
        creditsSpent: 900,
        toolsPurchased: 1,
      },
    },
  };
};

const validRaw = () => encodeSave(toSaveFile(validState(), { muted: true }));

describe('valid saves', () => {
  it('round-trips every persisted field', () => {
    const result = decodeSave(validRaw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { player, settings } = result.save;
    expect(player.xp).toBe(1200);
    expect(player.credits).toBe(900);
    expect(player.reputation).toBe(21);
    expect(player.unlockedToolIds).toEqual(['basic-scanner', 'decoder']);
    expect(player.completedMissionIds).toEqual(['first-connection', 'open-ports']);
    expect(player.achievementIds).toEqual(['first-contract']);
    expect(player.statistics.commandsExecuted).toBe(120);
    expect(settings.muted).toBe(true);
    expect(result.repaired).toBe(false);
  });

  it('restores into game state without disturbing anything else', () => {
    const result = decodeSave(validRaw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fresh = createInitialGameState(42);
    const restored = applySave(fresh, result.save);

    expect(restored.player.xp).toBe(1200);
    // The session is not restored: RNG and the loaded contract come from the
    // new game, not from storage.
    expect(restored.rng).toEqual(fresh.rng);
    expect(restored.activeMission).toEqual(fresh.activeMission);
    expect(restored.schemaVersion).toBe(fresh.schemaVersion);
  });
});

describe('missing saves', () => {
  it.each([null, '', '   '])('reports %j as empty, not as an error', (raw) => {
    const result = decodeSave(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });
});

describe('corrupted saves', () => {
  it.each([
    ['truncated json', '{"version":1,"player":'],
    ['not json at all', 'definitely not json'],
    ['a bare number', '12345'],
    ['a bare string', '"hello"'],
    ['an array', '[1,2,3]'],
    ['null', 'null'],
  ])('refuses %s without throwing', (_label, raw) => {
    expect(() => decodeSave(raw)).not.toThrow();
    expect(decodeSave(raw).ok).toBe(false);
  });

  it('refuses a file with no player record', () => {
    const result = decodeSave(JSON.stringify({ version: SAVE_VERSION, settings: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('malformed-player');
  });

  it('refuses a file with no version', () => {
    const result = decodeSave(JSON.stringify({ player: { xp: 1 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing-version');
  });
});

describe('outdated and future saves', () => {
  it.each([0, 2, 99, -1])('refuses version %i and says so', (version) => {
    const result = decodeSave(JSON.stringify({ version, player: { xp: 10 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported-version');
      expect(result.detail).toContain(String(version));
    }
  });

  it('accepts exactly the current version', () => {
    expect(decodeSave(validRaw()).ok).toBe(true);
  });
});

describe('missing fields', () => {
  it('fills a player record that has almost nothing', () => {
    const result = decodeSave(JSON.stringify({ version: SAVE_VERSION, player: {} }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.save.player.xp).toBe(0);
    expect(result.save.player.level).toBe(1);
    expect(result.save.player.credits).toBe(0);
    expect(result.save.player.unlockedToolIds).toEqual([]);
    expect(result.save.player.statistics.commandsExecuted).toBe(0);
    expect(result.save.settings.muted).toBe(false);
    expect(result.repaired).toBe(true);
  });

  it('defaults settings that are absent or the wrong type', () => {
    for (const settings of [undefined, null, 'yes', 7, []]) {
      const result = decodeSave(JSON.stringify({ version: SAVE_VERSION, player: {}, settings }));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.save.settings.muted).toBe(false);
    }
  });
});

describe('clamping hostile values', () => {
  const load = (player: unknown) =>
    decodeSave(JSON.stringify({ version: SAVE_VERSION, player, settings: { muted: false } }));

  it.each([
    ['negative credits', { credits: -5000 }, (p: { credits: number }) => p.credits === 0],
    ['fractional xp', { xp: 12.9 }, (p: { xp: number }) => p.xp === 12],
    ['string xp', { xp: '9999' }, (p: { xp: number }) => p.xp === 0],
    ['absurd credits', { credits: 1e30 }, (p: { credits: number }) => p.credits <= 1e12],
    ['negative statistics', { statistics: { commandsExecuted: -9 } }, (p: { statistics: { commandsExecuted: number } }) => p.statistics.commandsExecuted === 0],
  ])('clamps %s', (_label, player, check) => {
    const result = load(player);
    expect(result.ok).toBe(true);
    if (result.ok) expect(check(result.save.player as never)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'never lets %s through as a number',
    (value) => {
      // JSON cannot express these, so they arrive as null — which must still
      // resolve to a usable figure rather than propagating.
      const result = load({ xp: value, credits: value, reputation: value });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Number.isFinite(result.save.player.xp)).toBe(true);
        expect(Number.isFinite(result.save.player.credits)).toBe(true);
        expect(Number.isFinite(result.save.player.reputation)).toBe(true);
      }
    },
  );

  it('derives the level from XP rather than trusting a claimed one', () => {
    const result = load({ xp: 0, level: 40 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.player.level).toBe(1);
  });

  it('caps runaway lists', () => {
    const result = load({ unlockedToolIds: Array.from({ length: 5000 }, (_, i) => `t${String(i)}`) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.player.unlockedToolIds.length).toBeLessThanOrEqual(512);
  });

  it('drops non-string and empty ids', () => {
    const result = load({ unlockedToolIds: ['decoder', 42, null, '', {}, 'decoder'] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.player.unlockedToolIds).toEqual(['decoder']);
  });

  it('truncates an absurdly long id rather than storing it', () => {
    const result = load({ achievementIds: ['x'.repeat(10000)] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.player.achievementIds[0]?.length).toBeLessThanOrEqual(64);
  });
});

describe('storage is data, never code', () => {
  it('does not pollute the prototype from a crafted save', () => {
    const hostile = '{"version":1,"player":{"__proto__":{"polluted":true},"xp":10},"settings":{}}';
    const result = decodeSave(hostile);

    expect(result.ok).toBe(true);
    const probe: Record<string, unknown> = {};
    expect(probe.polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('carries no unexpected key into the restored state', () => {
    const result = decodeSave(
      JSON.stringify({
        version: SAVE_VERSION,
        player: { xp: 100, evil: 'payload', __proto__: { evil: true } },
        settings: { muted: false, evil: 'payload' },
        evil: 'payload',
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.save).sort()).toEqual(['player', 'settings', 'version']);
    expect(Object.keys(result.save.settings)).toEqual(['muted']);
    expect(result.save.player).not.toHaveProperty('evil');

    const restored = applySave(createInitialGameState(1), result.save);
    expect(restored.player).not.toHaveProperty('evil');
  });

  it('never returns a function from a save', () => {
    const result = decodeSave(validRaw());
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const value of Object.values(result.save.player)) {
        expect(typeof value).not.toBe('function');
      }
    }
  });
});
