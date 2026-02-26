import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMail } from '@hooks/useMail';
import type { MailMessageDetail } from '@shared/types';

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
        <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !message) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2.5 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded transition-colors duration-150 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-150"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors duration-150"
              title="Delete message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto">
        {/* Message header */}
        <div className="px-4 py-4 border-b border-gray-800/50">
          <h2 className="text-lg font-semibold text-white mb-3">
            {message.subject || '(No subject)'}
          </h2>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-10 pt-0.5 flex-shrink-0">From</span>
              <div className="text-sm">
                {message.from.name && (
                  <span className="text-white font-medium">{message.from.name} </span>
                )}
                <span className="text-gray-400">&lt;{message.from.address}&gt;</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-10 pt-0.5 flex-shrink-0">To</span>
              <div className="text-sm text-gray-400">
                {message.to.map((t) => t.address).join(', ')}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-10 pt-0.5 flex-shrink-0">Date</span>
              <span className="text-sm text-gray-400">{formatFullDate(message.createdAt)}</span>
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white hover:border-gray-600 transition-colors duration-150"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <span className="text-gray-500">({formatFileSize(att.size)})</span>
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
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
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
