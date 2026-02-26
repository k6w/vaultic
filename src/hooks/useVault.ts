import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '@shared/messages';
import type { VaultData } from '@shared/types';

interface UseVaultResult {
  vault: VaultData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVault(): UseVaultResult {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sendMessage<{ vault?: VaultData; error?: string }>({
        type: 'GET_VAULT',
      });
      if (response.error) {
        setError(response.error);
        setVault(null);
      } else {
        setVault(response.vault ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
      setVault(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  return { vault, loading, error, refetch: fetchVault };
}
