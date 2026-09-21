/**
 * Engine dependencies.
 *
 * The registry and the mission catalog are content, not state: they are
 * identical for every player and must never end up in a save file. Passing
 * them in as one object keeps `step` pure — everything it reads is an
 * argument — without threading a new parameter through each time the engine
 * gains a lookup.
 */
import type { AchievementCatalog } from './achievements/types';
import type { CommandRegistry } from './commands/types';
import type { MissionCatalog } from './missions/catalog';
import type { GameTool } from './progression/types';

export interface EngineDeps {
  readonly registry: CommandRegistry;
  readonly missions: MissionCatalog;
  /** Tool catalog, read for detection multipliers and the inventory view. */
  readonly tools: readonly GameTool[];
  readonly achievements: AchievementCatalog;
}
