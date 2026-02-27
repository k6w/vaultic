import { useState, useEffect, useCallback, useRef } from 'react';
import { useMail } from '@hooks/useMail';
import type { MailAccount, MailMessage } from '@shared/types';

interface InboxProps {
  accountId: string;
  account: MailAccount;
  onSelectMessage: (id: string) => void;
  onBack: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Inbox({ accountId, account, onSelectMessage, onBack }: InboxProps) {
  const { getMessages, loading, error } = useMail();
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const fetchMessages = useCallback(async (pageNum: number = 1) => {
    const result = await getMessages(accountId, pageNum);
    if (pageNum === 1) {
      setMessages(result.messages);
    } else {
      setMessages((prev) => [...prev, ...result.messages]);
    }
    setTotal(result.total);
  }, [accountId, getMessages]);

  useEffect(() => {
    setMessages([]);
    setPage(1);
    setTotal(0);
    fetchMessages(1);
  }, [accountId, fetchMessages]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchMessages(1);
    }, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  const handleRefresh = () => {
    setPage(1);
    fetchMessages(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch { /* ignore */ }
  };

  const hasMore = messages.length < total;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60">
        <button
          onClick={onBack}
          className="flex-shrink-0 p-1.5 -ml-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-150"
          title="Back to accounts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-white truncate">{account.address}</p>
            <button
              onClick={handleCopyAddress}
              className="flex-shrink-0 p-0.5 text-gray-500 hover:text-gray-300 transition-colors duration-150"
              title="Copy address"
            >
              {copiedAddress ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">{total} message{total !== 1 ? 's' : ''}</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors duration-150"
          title="Refresh"
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={loading ? 'animate-spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-3 mt-2 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex-shrink-0 px-2 py-1 text-[11px] text-red-300 hover:text-white bg-red-900/30 hover:bg-red-800/40 rounded transition-colors duration-150 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-gray-700 mb-3">
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-gray-400 mb-1">No messages yet</p>
            <p className="text-xs text-gray-500">
              Emails to <button onClick={handleCopyAddress} className="text-emerald-400 font-mono hover:underline">{account.address}</button> will appear here
            </p>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onSelectMessage(msg.id)}
                className="w-full text-left px-4 py-3 border-b border-gray-800/30 hover:bg-gray-800/40 active:bg-gray-800/60 transition-colors duration-150"
              >
                <div className="flex items-start gap-2.5">
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    {!msg.seen ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <div className="w-2 h-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${!msg.seen ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        {msg.from?.name || msg.from?.address || 'Unknown'}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-gray-500">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!msg.seen ? 'font-medium text-gray-200' : 'text-gray-400'}`}>
                      {msg.subject || '(No subject)'}
                    </p>
                    {msg.intro && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{msg.intro}</p>
                    )}
                  </div>

                  {msg.hasAttachments && (
                    <div className="flex-shrink-0 mt-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="px-4 py-3">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-2 text-xs text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 rounded-lg transition-colors duration-150 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : `Load more (${messages.length}/${total})`}
                </button>
              </div>
            )}
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
