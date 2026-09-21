/**
 * Global test guard.
 *
 * Cyber Hacker Simulator is a local simulation. No part of it may open a
 * network connection. Rather than trusting that by convention, every network
 * primitive is replaced with a throwing stub for the whole suite, so any code
 * path that reaches for one fails a test instead of escaping quietly.
 */
import { afterEach, beforeEach, vi } from 'vitest';

export class NetworkAccessError extends Error {
  constructor(api: string) {
    super(
      `Blocked network access via ${api}. The game must never contact a real host.`,
    );
    this.name = 'NetworkAccessError';
  }
}

/**
 * Returns a stub that throws whether it is called or constructed.
 *
 * It must be a function declaration, not an arrow: `new XMLHttpRequest()` on an
 * arrow throws "not a constructor" before the guard can report what was
 * blocked, which hides the real finding behind a confusing message.
 */
function block(api: string): () => never {
  function blocked(): never {
    throw new NetworkAccessError(api);
  }
  return blocked;
}

function installNetworkGuard(): void {
  vi.stubGlobal('fetch', block('fetch'));
  vi.stubGlobal('XMLHttpRequest', block('XMLHttpRequest'));
  vi.stubGlobal('WebSocket', block('WebSocket'));
  vi.stubGlobal('EventSource', block('EventSource'));
  // Replacing navigator wholesale would strip the properties jsdom and React
  // read, so the one method that can exfiltrate is patched in place.
  Object.defineProperty(globalThis.navigator, 'sendBeacon', {
    value: block('navigator.sendBeacon'),
    configurable: true,
    writable: true,
  });
}

beforeEach(installNetworkGuard);

afterEach(() => {
  vi.unstubAllGlobals();
});
