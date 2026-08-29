import { describe, expect, it } from 'vitest';
import { matchesOrigin, matchesQuery, normalizeOrigin, sortAccounts } from './accounts';
import type { TwoFactorAccount } from './types';

function account(overrides: Partial<TwoFactorAccount> = {}): TwoFactorAccount {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    issuer: 'Example',
    label: 'person@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('account helpers', () => {
  it('normalizes only exact HTTPS origins', () => {
    expect(normalizeOrigin('Example.com/path')).toBe('https://example.com');
    expect(normalizeOrigin('https://login.example.com/a')).toBe('https://login.example.com');
    expect(normalizeOrigin('http://example.com')).toBeNull();
    expect(normalizeOrigin('not a host')).toBeNull();
  });

  it('does not broaden approved origins to sibling hosts', () => {
    const item = account({ origins: ['https://login.example.com'] });
    expect(matchesOrigin(item, 'https://login.example.com')).toBe(true);
    expect(matchesOrigin(item, 'https://evil.example.com')).toBe(false);
  });

  it('searches metadata and sorts pinned/manual order predictably', () => {
    const first = account({ id: 'a', issuer: 'Alpha', tags: ['work'], sortOrder: 2 });
    const pinned = account({ id: 'b', issuer: 'Beta', pinned: true });
    const second = account({ id: 'c', issuer: 'Charlie', sortOrder: 1 });
    expect(sortAccounts([first, pinned, second]).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(matchesQuery(first, 'WORK')).toBe(true);
  });
});
