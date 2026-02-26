import { useState, useEffect, useRef } from 'react';
import { generateTOTP, getRemainingSeconds } from '@shared/totp';
import type { TwoFactorAccount } from '@shared/types';

export function useTotp(accounts: TwoFactorAccount[]): Map<string, string> {
  const [codes, setCodes] = useState<Map<string, string>>(new Map());
  const prevRemainingRef = useRef<number | null>(null);

  // Generate codes for all accounts
  const generateAllCodes = (accs: TwoFactorAccount[]): Map<string, string> => {
    const map = new Map<string, string>();
    for (const account of accs) {
      try {
        map.set(account.id, generateTOTP(account));
      } catch {
        map.set(account.id, '------');
      }
    }
    return map;
  };

  // Generate on mount and when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      setCodes(generateAllCodes(accounts));
    } else {
      setCodes(new Map());
    }
  }, [accounts]);

  // Regenerate when a period boundary is crossed
  useEffect(() => {
    if (accounts.length === 0) return;

    // Use the most common period (default 30)
    const period = accounts[0]?.period ?? 30;

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(period);
      const prev = prevRemainingRef.current;

      // Period boundary crossed when remaining jumps up (e.g., 1 -> 30)
      if (prev !== null && remaining > prev) {
        setCodes(generateAllCodes(accounts));
      }

      prevRemainingRef.current = remaining;
    }, 1000);

    return () => clearInterval(interval);
  }, [accounts]);

  return codes;
}
