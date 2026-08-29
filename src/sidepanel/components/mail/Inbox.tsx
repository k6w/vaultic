import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Check, Copy, Inbox as InboxIcon, Paperclip, RefreshCw } from 'lucide-react';
import { useMail } from '@hooks/useMail';
import type { MailAccount, MailMessage } from '@shared/types';
import { Button, IconButton, Spinner, EmptyState, cn } from '@shared/ui';
import { sendMessage } from '@shared/messages';

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
      if (result.messages[0]?.id) {
        await sendMessage({ type: 'MAIL_MARK_SEEN', accountId, messageId: result.messages[0].id });
      }
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
      <header className="flex items-center gap-2 px-3 h-14 border-b border-border">
        <IconButton label="Back to accounts" size="sm" onClick={onBack}>
          <ArrowLeft size={17} />
        </IconButton>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-text truncate">{account.address}</p>
            <button
              onClick={handleCopyAddress}
              className="flex-shrink-0 p-0.5 text-text-muted hover:text-text transition-colors duration-150"
              title="Copy address"
            >
              {copiedAddress ? (
                <Check size={12} className="text-accent" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
          <p className="text-[11px] text-text-muted">{total} message{total !== 1 ? 's' : ''}</p>
        </div>

        <IconButton label="Refresh" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
        </IconButton>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-3 mt-2 bg-danger-soft border border-border rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-danger flex-1">{error}</p>
              <Button size="sm" variant="danger" onClick={handleRefresh} disabled={loading}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {!loading && messages.length === 0 ? (
          <EmptyState
            className="h-full"
            icon={<InboxIcon size={26} />}
            title="No messages yet"
            description="New mail lands here automatically. Send anything to this address to see it appear."
          />
        ) : (
          <div className="px-2 py-2 space-y-0.5">
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onSelectMessage(msg.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-hover active:bg-surface-2 transition-colors duration-150"
              >
                <div className="flex items-start gap-2.5">
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    {!msg.seen ? (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    ) : (
                      <div className="w-2 h-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={cn('text-sm truncate', !msg.seen ? 'font-semibold text-text' : 'text-text-secondary')}>
                        {msg.from?.name || msg.from?.address || 'Unknown'}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-text-muted">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className={cn('text-sm truncate', !msg.seen ? 'font-medium text-text' : 'text-text-secondary')}>
                      {msg.subject || '(No subject)'}
                    </p>
                    {msg.intro && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{msg.intro}</p>
                    )}
                  </div>

                  {msg.hasAttachments && (
                    <div className="flex-shrink-0 mt-1">
                      <Paperclip size={12} className="text-text-muted" />
                    </div>
                  )}
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="px-2 py-2">
                <Button variant="secondary" block onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading...' : `Load more (${messages.length}/${total})`}
                </Button>
              </div>
            )}
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Spinner size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
