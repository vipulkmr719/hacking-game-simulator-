/**
 * Browser storage adapter.
 *
 * Lives outside src/game because the engine is barred from touching storage —
 * the rule that keeps it pure and testable without a DOM. Everything here is
 * I/O; all the judgement about what a save may contain is in src/game/save.
 *
 * Every access is wrapped: private browsing, blocked site data and a full
 * quota all throw rather than returning nothing, and none of them should cost
 * a player their session.
 */
import { decodeSave } from '../game/save/validate';
import { encodeSave } from '../game/save/serialize';
import type { LoadResult, SaveFile } from '../game/save/types';

export const SAVE_STORAGE_KEY = 'chs.save.v1';

export function loadSave(): LoadResult {
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(SAVE_STORAGE_KEY);
  } catch {
    return { ok: false, reason: 'unreadable', detail: 'Storage is unavailable.' };
  }
  return decodeSave(raw);
}

/** Returns false when the write failed, so a caller can tell the player. */
export function writeSave(save: SaveFile): boolean {
  try {
    globalThis.localStorage.setItem(SAVE_STORAGE_KEY, encodeSave(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): boolean {
  try {
    globalThis.localStorage.removeItem(SAVE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
