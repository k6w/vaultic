import { useState, useCallback } from 'react';
import { sendMessage } from '@shared/messages';
import type { MailAccount, MailMessage, MailMessageDetail, MailDomain } from '@shared/types';

export function useMail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDomains = useCallback(async (): Promise<MailDomain[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ domains?: MailDomain[]; error?: string }>({ type: 'MAIL_GET_DOMAINS' });
      if (res.error) throw new Error(res.error);
      return res.domains ?? [];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (address: string, password: string): Promise<MailAccount | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ account?: MailAccount; error?: string }>({ type: 'MAIL_CREATE_ACCOUNT', address, password });
      if (res.error) throw new Error(res.error);
      return res.account ?? null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (accountId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ error?: string }>({ type: 'MAIL_DELETE_ACCOUNT', accountId });
      if (res.error) throw new Error(res.error);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (accountId: string, page?: number): Promise<{ messages: MailMessage[]; total: number }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ messages?: MailMessage[]; total?: number; error?: string }>({ type: 'MAIL_GET_MESSAGES', accountId, page });
      if (res.error) throw new Error(res.error);
      return { messages: res.messages ?? [], total: res.total ?? 0 };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return { messages: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessage = useCallback(async (accountId: string, messageId: string): Promise<MailMessageDetail | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ message?: MailMessageDetail; error?: string }>({ type: 'MAIL_GET_MESSAGE', accountId, messageId });
      if (res.error) throw new Error(res.error);
      return res.message ?? null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMessage = useCallback(async (accountId: string, messageId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ error?: string }>({ type: 'MAIL_DELETE_MESSAGE', accountId, messageId });
      if (res.error) throw new Error(res.error);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getDomains, createAccount, deleteAccount, getMessages, getMessage, deleteMessage, loading, error, setError };
}
