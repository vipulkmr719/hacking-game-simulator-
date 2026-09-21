/**
 * Lookup and reveal helpers for simulated entities.
 *
 * Two jobs. Resolution turns a token the player typed into a game object by
 * matching it against the target's own tables — a name is only ever compared,
 * never used as an address. Revelation records what recon has uncovered, so
 * output can be limited to what the player has actually found.
 */
import type { DiscoveredState } from '../missions/types';
import type {
  SimulatedFile,
  SimulatedHost,
  SimulatedPort,
  SimulatedService,
  SimulatedTarget,
  SimulatedVulnerability,
} from './types';

function matches(token: string, ...candidates: readonly string[]): boolean {
  const needle = token.trim().toLowerCase();
  return candidates.some((candidate) => candidate.toLowerCase() === needle);
}

export function resolveHost(target: SimulatedTarget, token: string): SimulatedHost | null {
  return target.hosts.find((host) => matches(token, host.id, host.label, host.address)) ?? null;
}

export function resolveService(target: SimulatedTarget, token: string): SimulatedService | null {
  for (const host of target.hosts) {
    const service = host.services.find((candidate) => matches(token, candidate.id, candidate.name));
    if (service !== undefined) {
      return service;
    }
  }
  return null;
}

export function resolveFile(target: SimulatedTarget, token: string): SimulatedFile | null {
  for (const host of target.hosts) {
    const file = host.files.find((candidate) => matches(token, candidate.id, candidate.name));
    if (file !== undefined) {
      return file;
    }
  }
  return null;
}

export function resolveVulnerability(
  target: SimulatedTarget,
  token: string,
): SimulatedVulnerability | null {
  for (const host of target.hosts) {
    const found = host.vulnerabilities.find((candidate) => matches(token, candidate.id));
    if (found !== undefined) {
      return found;
    }
  }
  return null;
}

export function hostOfPort(target: SimulatedTarget, portId: string): SimulatedHost | null {
  return target.hosts.find((host) => host.ports.some((port) => port.id === portId)) ?? null;
}

export function hostOfService(target: SimulatedTarget, serviceId: string): SimulatedHost | null {
  return target.hosts.find((host) => host.services.some((s) => s.id === serviceId)) ?? null;
}

export function findServiceById(
  target: SimulatedTarget,
  serviceId: string,
): SimulatedService | null {
  for (const host of target.hosts) {
    const service = host.services.find((candidate) => candidate.id === serviceId);
    if (service !== undefined) {
      return service;
    }
  }
  return null;
}

/**
 * Ports already revealed that match a token, which may be a port number or a
 * port id. Returns every match so callers can report an ambiguity rather than
 * guessing which host the player meant.
 */
export function resolveDiscoveredPorts(
  target: SimulatedTarget,
  discovered: DiscoveredState,
  token: string,
): readonly { readonly host: SimulatedHost; readonly port: SimulatedPort }[] {
  const results: { host: SimulatedHost; port: SimulatedPort }[] = [];
  for (const host of target.hosts) {
    for (const port of host.ports) {
      if (!discovered.portIds.includes(port.id)) {
        continue;
      }
      if (matches(token, port.id, String(port.number))) {
        results.push({ host, port });
      }
    }
  }
  return results;
}

function mergeIds(existing: readonly string[], incoming: readonly string[]): readonly string[] {
  return [...new Set([...existing, ...incoming])];
}

export function revealHosts(
  discovered: DiscoveredState,
  hostIds: readonly string[],
): DiscoveredState {
  return { ...discovered, hostIds: mergeIds(discovered.hostIds, hostIds) };
}

export function revealPorts(
  discovered: DiscoveredState,
  portIds: readonly string[],
): DiscoveredState {
  return { ...discovered, portIds: mergeIds(discovered.portIds, portIds) };
}

export function revealService(
  discovered: DiscoveredState,
  serviceId: string,
  vulnerabilityIds: readonly string[],
): DiscoveredState {
  return {
    ...discovered,
    serviceIds: mergeIds(discovered.serviceIds, [serviceId]),
    vulnerabilityIds: mergeIds(discovered.vulnerabilityIds, vulnerabilityIds),
  };
}

export function revealFiles(
  discovered: DiscoveredState,
  fileIds: readonly string[],
): DiscoveredState {
  return { ...discovered, fileIds: mergeIds(discovered.fileIds, fileIds) };
}
