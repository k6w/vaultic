import { MAIL_API_BASE } from './constants';
import type { MailDomain, MailMessage, MailMessageDetail } from './types';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${MAIL_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication failed. Please re-authenticate.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please try again later.');
    }

    // Parse structured error responses (mail.tm returns hydra violations)
    const text = await response.text().catch(() => '');
    let friendlyMessage = '';

    if (text) {
      try {
        const errorBody = JSON.parse(text);
        // Handle 422 validation errors with violations array
        if (errorBody.violations && Array.isArray(errorBody.violations)) {
          friendlyMessage = errorBody.violations
            .map((v: { propertyPath?: string; message?: string }) => {
              const field = v.propertyPath ? `${v.propertyPath}: ` : '';
              return `${field}${v.message || 'Validation error'}`;
            })
            .join('. ');
        } else if (errorBody['hydra:description']) {
          friendlyMessage = errorBody['hydra:description'];
        } else if (errorBody.detail) {
          friendlyMessage = errorBody.detail;
        }
      } catch {
        // Not JSON, use raw text
      }
    }

    if (!friendlyMessage) {
      friendlyMessage = response.status === 422
        ? 'Validation error. Please check your input.'
        : `Request failed (${response.status})`;
    }

    throw new Error(friendlyMessage);
  }

  // DELETE responses may have no body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

interface HydraCollection<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
}

interface DomainResponse {
  id: string;
  domain: string;
  isActive: boolean;
}

interface AccountResponse {
  id: string;
  address: string;
}

interface TokenResponse {
  token: string;
}

interface MeResponse {
  id: string;
  address: string;
  quota: number;
  used: number;
}

export class MailTmClient {
  static async getDomains(): Promise<MailDomain[]> {
    const data = await request<HydraCollection<DomainResponse>>('/domains');
    return data['hydra:member'].map((d) => ({
      id: d.id,
      domain: d.domain,
      isActive: d.isActive,
    }));
  }

  static async createAccount(
    address: string,
    password: string,
  ): Promise<{ id: string; address: string }> {
    const data = await request<AccountResponse>('/accounts', {
      method: 'POST',
      body: JSON.stringify({ address, password }),
    });
    return { id: data.id, address: data.address };
  }

  static async getToken(
    address: string,
    password: string,
  ): Promise<string> {
    const data = await request<TokenResponse>('/token', {
      method: 'POST',
      body: JSON.stringify({ address, password }),
    });
    return data.token;
  }

  static async getMessages(
    token: string,
    page: number = 1,
  ): Promise<{ messages: MailMessage[]; total: number }> {
    const data = await request<HydraCollection<MailMessage>>(
      `/messages?page=${page}`,
      { headers: authHeaders(token) },
    );
    return {
      messages: data['hydra:member'],
      total: data['hydra:totalItems'],
    };
  }

  static async getMessage(
    token: string,
    messageId: string,
  ): Promise<MailMessageDetail> {
    return request<MailMessageDetail>(`/messages/${messageId}`, {
      headers: authHeaders(token),
    });
  }

  static async deleteMessage(
    token: string,
    messageId: string,
  ): Promise<void> {
    await request<void>(`/messages/${messageId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
  }

  static async deleteAccount(
    token: string,
    accountId: string,
  ): Promise<void> {
    await request<void>(`/accounts/${accountId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
  }

  static async downloadAttachment(token: string, downloadUrl: string): Promise<ArrayBuffer> {
    const url = new URL(downloadUrl, MAIL_API_BASE);
    if (url.origin !== new URL(MAIL_API_BASE).origin) {
      throw new Error('Unsafe attachment URL');
    }
    const response = await fetch(url.href, { headers: authHeaders(token) });
    if (!response.ok) throw new Error(`Attachment download failed (${response.status})`);
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > 10 * 1024 * 1024) throw new Error('Attachment exceeds the 10 MB safety limit');
    const data = await response.arrayBuffer();
    if (data.byteLength > 10 * 1024 * 1024) throw new Error('Attachment exceeds the 10 MB safety limit');
    return data;
  }

  static async getMe(
    token: string,
  ): Promise<{ id: string; address: string; quota: number; used: number }> {
    return request<MeResponse>('/me', {
      headers: authHeaders(token),
    });
  }
}
