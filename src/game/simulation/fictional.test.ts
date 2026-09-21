import { describe, expect, it } from 'vitest';
import { isDocumentationAddress, isFictionalDomain } from './fictional';

describe('isFictionalDomain', () => {
  it.each(['acme.local', 'novabank.sim', 'helix.internal', 'orion.corp', 'edge.acme.local'])(
    'accepts %s',
    (domain) => {
      expect(isFictionalDomain(domain)).toBe(true);
    },
  );

  it.each(['example.com', 'google.com', 'acme.co.uk', 'localhost', 'acme.net', ''])(
    'rejects %s',
    (domain) => {
      expect(isFictionalDomain(domain)).toBe(false);
    },
  );

  it('normalizes case and surrounding whitespace', () => {
    expect(isFictionalDomain('  ACME.Local ')).toBe(true);
  });
});

describe('isDocumentationAddress', () => {
  it.each(['192.0.2.1', '198.51.100.255', '203.0.113.0'])('accepts %s', (address) => {
    expect(isDocumentationAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '10.0.0.1', '192.0.3.1', '192.0.2.256', '192.0.2.', 'not-an-address'])(
    'rejects %s',
    (address) => {
      expect(isDocumentationAddress(address)).toBe(false);
    },
  );
});
