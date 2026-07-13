import type { TwoFactorAccount } from './types';

/** Pinned first, then manual order, then alphabetical by issuer. */
export function sortAccounts(accounts: TwoFactorAccount[]): TwoFactorAccount[] {
  return [...accounts].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.issuer.localeCompare(b.issuer);
  });
}

/** Case-insensitive match over issuer, label, and tags. */
export function matchesQuery(a: TwoFactorAccount, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return (
    a.issuer.toLowerCase().includes(query) ||
    a.label.toLowerCase().includes(query) ||
    (a.tags ?? []).some((t) => t.toLowerCase().includes(query))
  );
}
