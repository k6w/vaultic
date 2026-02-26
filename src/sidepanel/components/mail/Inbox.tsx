import { useState, useEffect, useCallback, useRef } from 'react';
import { useMail } from '@hooks/useMail';
import type { MailAccount, MailMessage } from '@shared/types';

interface InboxProps {
  accountId: string;
  account: MailAccount;
  onSelectMessage: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Inbox({ accountId, account, onSelectMessage }: InboxProps) {
  const { getMessages, loading, error } = useMail();
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchMessages(1);
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

  const hasMore = messages.length < total;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{account.address}</p>
          <p className="text-xs text-gray-500">{total} message{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors duration-150"
          title="Refresh inbox"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
          <div className="mx-4 mt-3 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-700 mb-3"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="22,6 12,13 2,6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-400 mb-1">No messages yet</p>
            <p className="text-xs text-gray-500">
              Emails sent to <span className="text-emerald-400 font-mono">{account.address}</span> will appear here.
            </p>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onSelectMessage(msg.id)}
                className="w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors duration-150 group"
              >
                <div className="flex items-start gap-3">
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
                        {msg.from.name || msg.from.address}
                      </p>
                      <span className="flex-shrink-0 text-xs text-gray-500">
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

                  {/* Attachment indicator */}
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

            {/* Load more */}
            {hasMore && (
              <div className="px-4 py-3">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : `Load more (${messages.length} of ${total})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial loading */}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
