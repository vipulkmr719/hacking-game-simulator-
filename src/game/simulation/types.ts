/**
 * Fictional network entities.
 *
 * Nothing here is a real host. A SimulatedTarget is a bag of data the engine
 * reads to generate output; no address in it is ever passed to a socket, a
 * URL, or a DNS lookup. See `fictional.ts` for the guards that keep the data
 * itself inside reserved, non-routable ranges.
 */

export const ACCESS_LEVELS = ['none', 'guest', 'user', 'elevated', 'root'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export function accessRank(level: AccessLevel): number {
  return ACCESS_LEVELS.indexOf(level);
}

export function meetsAccessLevel(current: AccessLevel, required: AccessLevel): boolean {
  return accessRank(current) >= accessRank(required);
}

export type ServiceState = 'open' | 'filtered' | 'closed';

export interface SimulatedPort {
  readonly id: string;
  readonly number: number;
  readonly state: ServiceState;
  readonly serviceId: string | null;
}

export interface SimulatedService {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly banner: string;
  readonly vulnerabilityIds: readonly string[];
}

/**
 * A fictional weakness. It carries no exploit code and no real technique —
 * only an identifier the puzzle and mission layers key off.
 */
export interface SimulatedVulnerability {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly requiredToolId: string | null;
  readonly grantsAccessLevel: AccessLevel;
  readonly detectionCost: number;
}

export interface SimulatedFile {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly encrypted: boolean;
  readonly requiredAccessLevel: AccessLevel;
  readonly contents: string;
}

export type LogSeverity = 'info' | 'notice' | 'warning' | 'alert';

/**
 * A fictional log line. Timestamps are fixed strings in the data, never read
 * from the clock, so the same target always prints the same log.
 */
export interface SimulatedLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly severity: LogSeverity;
  readonly message: string;
}

export interface SimulatedHost {
  readonly id: string;
  readonly label: string;
  /** A reserved documentation address. Never routable. */
  readonly address: string;
  readonly ports: readonly SimulatedPort[];
  readonly services: readonly SimulatedService[];
  readonly vulnerabilities: readonly SimulatedVulnerability[];
  readonly files: readonly SimulatedFile[];
  readonly logs: readonly SimulatedLogEntry[];
}

export interface SimulatedTarget {
  readonly id: string;
  readonly organization: string;
  /** A fictional domain such as `acme.local`. Never resolves. */
  readonly domain: string;
  readonly hosts: readonly SimulatedHost[];
}
