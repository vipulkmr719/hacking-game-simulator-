/**
 * Mission lookup.
 *
 * GameState stores only a mission id, so something has to turn that id back
 * into the mission's data. Keeping the catalog out of state means the target
 * tables are never copied into a save.
 */
import type { Mission } from './types';

export interface MissionCatalog {
  readonly all: readonly Mission[];
  readonly byId: (id: string) => Mission | null;
}

export class DuplicateMissionError extends Error {
  constructor(id: string) {
    super(`Mission id "${id}" is registered twice.`);
    this.name = 'DuplicateMissionError';
  }
}

export function createMissionCatalog(missions: readonly Mission[]): MissionCatalog {
  const byId = new Map<string, Mission>();
  for (const mission of missions) {
    if (byId.has(mission.id)) {
      throw new DuplicateMissionError(mission.id);
    }
    byId.set(mission.id, mission);
  }

  return { all: [...missions], byId: (id) => byId.get(id) ?? null };
}
