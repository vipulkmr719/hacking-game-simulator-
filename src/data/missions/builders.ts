/**
 * Compact constructors for target data.
 *
 * Each returns a plain object — missions stay pure data, and the boundary test
 * still proves it by JSON round-tripping every shipped mission. These exist
 * only to derive predictable ids and default the fields most hosts leave
 * alone, so a mission file reads as content rather than boilerplate.
 */
import type {
  AccessLevel,
  LogSeverity,
  ServiceState,
  SimulatedFile,
  SimulatedHost,
  SimulatedLogEntry,
  SimulatedPort,
  SimulatedService,
  SimulatedVulnerability,
} from '../../game/simulation/types';

interface PortSpec {
  readonly number: number;
  readonly state: ServiceState;
  readonly service?: string;
}

interface FileSpec {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly contents: string;
  readonly encrypted?: boolean;
  readonly access?: AccessLevel;
  readonly puzzleId?: string;
}

interface LogSpec {
  readonly at: string;
  readonly severity: LogSeverity;
  readonly message: string;
}

interface ServiceSpec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly banner: string;
  readonly weaknesses?: readonly string[];
}

interface VulnerabilitySpec {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly grants: AccessLevel;
  readonly trace: number;
  readonly tool?: string;
}

export interface HostSpec {
  readonly id: string;
  readonly label: string;
  /** Must be an RFC 5737 documentation address; a test enforces it. */
  readonly address: string;
  readonly ports: readonly PortSpec[];
  readonly services?: readonly ServiceSpec[];
  readonly weaknesses?: readonly VulnerabilitySpec[];
  readonly files?: readonly FileSpec[];
  readonly logs?: readonly LogSpec[];
}

/** Port ids are derived, so objectives can reference `<host>-p<number>`. */
function buildPort(hostId: string, spec: PortSpec): SimulatedPort {
  return {
    id: `${hostId}-p${String(spec.number)}`,
    number: spec.number,
    state: spec.state,
    serviceId: spec.service ?? null,
  };
}

function buildService(spec: ServiceSpec): SimulatedService {
  return {
    id: spec.id,
    name: spec.name,
    version: spec.version,
    banner: spec.banner,
    vulnerabilityIds: spec.weaknesses ?? [],
  };
}

function buildVulnerability(spec: VulnerabilitySpec): SimulatedVulnerability {
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    requiredToolId: spec.tool ?? null,
    grantsAccessLevel: spec.grants,
    detectionCost: spec.trace,
  };
}

function buildFile(spec: FileSpec): SimulatedFile {
  return {
    id: spec.id,
    name: spec.name,
    sizeBytes: spec.sizeBytes,
    encrypted: spec.encrypted ?? false,
    requiredAccessLevel: spec.access ?? 'none',
    contents: spec.contents,
    puzzleId: spec.puzzleId ?? null,
  };
}

function buildLog(hostId: string, spec: LogSpec, index: number): SimulatedLogEntry {
  return {
    id: `${hostId}-l${String(index + 1)}`,
    timestamp: spec.at,
    severity: spec.severity,
    message: spec.message,
  };
}

export function defineHost(spec: HostSpec): SimulatedHost {
  return {
    id: spec.id,
    label: spec.label,
    address: spec.address,
    ports: spec.ports.map((port) => buildPort(spec.id, port)),
    services: (spec.services ?? []).map(buildService),
    vulnerabilities: (spec.weaknesses ?? []).map(buildVulnerability),
    files: (spec.files ?? []).map(buildFile),
    logs: (spec.logs ?? []).map((log, index) => buildLog(spec.id, log, index)),
  };
}
