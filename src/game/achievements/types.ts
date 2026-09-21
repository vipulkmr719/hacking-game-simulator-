/**
 * Achievement model.
 *
 * Achievements are data, like missions. A definition names a closed trigger;
 * it cannot carry a predicate, so the catalog can never become a place where
 * logic hides.
 */

/**
 * Closed set of things an achievement may watch.
 *
 * Contract-specific achievements use `mission-completed` rather than being
 * listed on the contract's reward. One award path means one place that decides
 * whether an achievement is earned, and one place that pays for it.
 */
export type AchievementTrigger =
  | { readonly type: 'mission-completed'; readonly missionId: string }
  | { readonly type: 'level-reached'; readonly level: number }
  | { readonly type: 'missions-completed'; readonly count: number }
  | { readonly type: 'missions-failed'; readonly count: number }
  | { readonly type: 'commands-executed'; readonly count: number }
  | { readonly type: 'tools-owned'; readonly count: number }
  | { readonly type: 'credits-held'; readonly amount: number };

export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly trigger: AchievementTrigger;
  /** Paid once, the first time the achievement is earned. */
  readonly xp: number;
}

export interface AchievementCatalog {
  readonly all: readonly Achievement[];
  readonly byId: (id: string) => Achievement | null;
}
