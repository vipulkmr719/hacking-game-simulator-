import type { Achievement, AchievementCatalog } from './types';

export class DuplicateAchievementError extends Error {
  constructor(id: string) {
    super(`Achievement id "${id}" is registered twice.`);
    this.name = 'DuplicateAchievementError';
  }
}

export function createAchievementCatalog(
  achievements: readonly Achievement[],
): AchievementCatalog {
  const byId = new Map<string, Achievement>();
  for (const achievement of achievements) {
    if (byId.has(achievement.id)) {
      throw new DuplicateAchievementError(achievement.id);
    }
    byId.set(achievement.id, achievement);
  }

  return { all: [...achievements], byId: (id) => byId.get(id) ?? null };
}
