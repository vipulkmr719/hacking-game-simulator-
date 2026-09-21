/**
 * Guards that keep simulated targets fictional.
 *
 * The engine never opens a connection, so these checks are not what stops a
 * real request — the architecture is. What they stop is game *data* drifting
 * toward real infrastructure: a mission author pasting a real domain or a
 * routable IP into a fixture. Tests assert every shipped target passes.
 *
 * Addresses come from the RFC 5737 documentation ranges, which are reserved
 * precisely so that examples cannot reach anything.
 */

export const FICTIONAL_TLDS = [
  'local',
  'sim',
  'internal',
  'corp',
  'test',
  'invalid',
  'example',
] as const;

/** RFC 5737 TEST-NET-1/2/3 prefixes. */
const DOCUMENTATION_PREFIXES = ['192.0.2.', '198.51.100.', '203.0.113.'] as const;

const DOMAIN_SHAPE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function isFictionalDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase();
  if (!DOMAIN_SHAPE.test(normalized)) {
    return false;
  }
  const tld = normalized.slice(normalized.lastIndexOf('.') + 1);
  return (FICTIONAL_TLDS as readonly string[]).includes(tld);
}

export function isDocumentationAddress(address: string): boolean {
  const normalized = address.trim();
  const prefix = DOCUMENTATION_PREFIXES.find((candidate) => normalized.startsWith(candidate));
  if (prefix === undefined) {
    return false;
  }
  const lastOctet = normalized.slice(prefix.length);
  if (!/^\d{1,3}$/.test(lastOctet)) {
    return false;
  }
  const value = Number(lastOctet);
  return value >= 0 && value <= 255;
}
