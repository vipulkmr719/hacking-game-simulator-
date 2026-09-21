/**
 * Reading a save file.
 *
 * Everything in storage is untrusted: a player can edit it, another tab can
 * write it, and a previous version of the game may have left something this
 * one has never seen. So nothing here trusts a shape — every field is read
 * individually, checked, and clamped, and the result is a fresh object built
 * from primitives.
 *
 * Nothing from storage is ever executed. `JSON.parse` is the only interpreter
 * involved, and the parsed value is never spread, never merged into state, and
 * never used as a key into anything. That matters specifically because
 * `JSON.parse` will happily produce an own `__proto__` property, which a
 * spread or `Object.assign` would carry into a real prototype.
 */
import { MAX_LEVEL, levelForXp } from '../progression/levels';
import {
  SAVE_VERSION,
  type LoadResult,
  type SaveFile,
  type SavedPlayer,
  type SavedSettings,
  type SavedStatistics,
} from './types';

/** Caps list lengths so a hand-edited save cannot make the game allocate forever. */
const MAX_LIST_ENTRIES = 512;
const MAX_ID_LENGTH = 64;
const MAX_NUMBER = 1e12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A whole number in [0, MAX_NUMBER]; anything else becomes the fallback. */
function readCount(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(MAX_NUMBER, Math.max(0, Math.floor(value)));
}

/**
 * A list of plausible ids, de-duplicated.
 *
 * Ids are only ever compared against catalogs, so an unknown one is inert —
 * it is dropped at lookup rather than needing to be rejected here. What is
 * enforced is that the list is a list of short strings.
 */
function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.slice(0, MAX_ID_LENGTH))
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_LIST_ENTRIES);
  return [...new Set(ids)];
}

function readStatistics(value: unknown): SavedStatistics {
  const source = isRecord(value) ? value : {};
  return {
    commandsExecuted: readCount(source.commandsExecuted),
    missionsAttempted: readCount(source.missionsAttempted),
    missionsCompleted: readCount(source.missionsCompleted),
    missionsFailed: readCount(source.missionsFailed),
    creditsSpent: readCount(source.creditsSpent),
    toolsPurchased: readCount(source.toolsPurchased),
  };
}

function readSettings(value: unknown): SavedSettings {
  const source = isRecord(value) ? value : {};
  return { muted: source.muted === true };
}

function readPlayer(value: unknown): SavedPlayer | null {
  if (!isRecord(value)) {
    return null;
  }

  const xp = readCount(value.xp);

  return {
    xp,
    // The level is derived rather than trusted: a save claiming level 40 on
    // zero XP would otherwise unlock the whole campaign.
    level: Math.min(MAX_LEVEL, levelForXp(xp)),
    credits: readCount(value.credits),
    reputation: readCount(value.reputation),
    unlockedToolIds: readIdList(value.unlockedToolIds),
    completedMissionIds: readIdList(value.completedMissionIds),
    achievementIds: readIdList(value.achievementIds),
    statistics: readStatistics(value.statistics),
  };
}

/**
 * Parses and validates a stored save.
 *
 * `repaired` says a valid save needed clamping or defaulting — useful for
 * telling a player their file was touched rather than silently rewriting it.
 */
export function decodeSave(raw: string | null): LoadResult {
  if (raw === null || raw.trim() === '') {
    return { ok: false, reason: 'empty', detail: 'No save found.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'unreadable', detail: 'Save is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: 'not-an-object', detail: 'Save is not an object.' };
  }

  const { version } = parsed;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { ok: false, reason: 'missing-version', detail: 'Save has no version.' };
  }

  if (version !== SAVE_VERSION) {
    // Only one version has ever existed, so there is nothing to migrate from
    // yet. A save from any other version is refused rather than guessed at;
    // when a second version ships, the migration goes here.
    return {
      ok: false,
      reason: 'unsupported-version',
      detail: `Save version ${String(version)} cannot be read by version ${String(SAVE_VERSION)}.`,
    };
  }

  const player = readPlayer(parsed.player);
  if (player === null) {
    return { ok: false, reason: 'malformed-player', detail: 'Save has no player record.' };
  }

  const save: SaveFile = { version: SAVE_VERSION, player, settings: readSettings(parsed.settings) };
  return { ok: true, save, repaired: !matchesInput(parsed, save) };
}

/**
 * Order-insensitive comparison.
 *
 * A plain stringify would call a perfectly good save "repaired" purely because
 * validation rebuilds objects with its own key order, and the player would see
 * a correction warning on every single load.
 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/** True when the stored file already said exactly what validation produced. */
function matchesInput(parsed: Record<string, unknown>, save: SaveFile): boolean {
  return canonical(parsed) === canonical(save);
}
