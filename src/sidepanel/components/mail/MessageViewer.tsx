import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Paperclip, Trash2 } from 'lucide-react';
import { useMail } from '@hooks/useMail';
import type { MailMessageDetail } from '@shared/types';
import { Button, IconButton, Spinner } from '@shared/ui';

interface MessageViewerProps {
  accountId: string;
  messageId: string;
  onBack: () => void;
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSandboxedHtml(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#111827;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:16px;margin:0;font-size:14px;line-height:1.6;word-wrap:break-word}a{color:#34d399}img{max-width:100%;height:auto}pre{overflow-x:auto;background:#1f2937;padding:12px;border-radius:6px}table{border-collapse:collapse;max-width:100%}td,th{padding:4px 8px}</style></head><body>${html}</body></html>`;
}

export default function MessageViewer({ accountId, messageId, onBack }: MessageViewerProps) {
  const { getMessage, deleteMessage, loading, error } = useMail();
  const [message, setMessage] = useState<MailMessageDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetch() {
      const msg = await getMessage(accountId, messageId);
      setMessage(msg);
    }
    fetch();
  }, [accountId, messageId, getMessage]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const success = await deleteMessage(accountId, messageId);
    if (success) {
      onBack();
    }
    setDeleting(false);
    setConfirmDelete(false);
  }, [accountId, messageId, deleteMessage, onBack]);

  const htmlContent = useMemo(() => {
    if (!message) return null;
    if (message.html && message.html.length > 0) {
      return buildSandboxedHtml(message.html.join(''));
    }
    return null;
  }, [message]);

  if (loading && !message) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={22} />
      </div>
    );
  }

  if (error && !message) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <p className="text-sm text-danger mb-3">{error}</p>
        <Button variant="secondary" size="sm" onClick={onBack}>
          Go back
        </Button>
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-3 h-14 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </Button>

        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Delete?</span>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </div>
          ) : (
            <IconButton
              label="Delete message"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="hover:text-danger"
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      </header>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto">
        {/* Message header */}
        <div className="px-4 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-text mb-3">
            {message.subject || '(No subject)'}
          </h2>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs text-text-muted w-10 pt-0.5 flex-shrink-0">From</span>
              <div className="text-sm">
                {message.from?.name && (
                  <span className="text-text font-medium">{message.from.name} </span>
                )}
                <span className="text-text-secondary">&lt;{message.from?.address ?? 'unknown'}&gt;</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-text-muted w-10 pt-0.5 flex-shrink-0">To</span>
              <div className="text-sm text-text-secondary">
                {(message.to ?? []).map((t) => t.address).join(', ') || 'unknown'}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-text-muted w-10 pt-0.5 flex-shrink-0">Date</span>
              <span className="text-sm text-text-secondary">{message.createdAt ? formatFullDate(message.createdAt) : 'Unknown date'}</span>
            </div>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-2 border border-border rounded-md text-xs text-text-secondary hover:text-text hover:border-border-strong transition-colors duration-150"
                >
                  <Paperclip size={12} />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <span className="text-text-muted">({formatFileSize(att.size)})</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-same-origin"
              title="Email content"
              className="w-full border-0 rounded-lg"
              style={{ minHeight: '300px' }}
              onLoad={(e) => {
                // Auto-resize iframe to fit content
                const iframe = e.target as HTMLIFrameElement;
                try {
                  const doc = iframe.contentDocument;
                  if (doc?.body) {
                    iframe.style.height = `${doc.body.scrollHeight + 32}px`;
                  }
                } catch {
                  // Security restriction, keep default height
                }
              }}
            />
          ) : (
            <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
              {message.text || '(No content)'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
