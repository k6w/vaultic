import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Image, Paperclip, Trash2 } from 'lucide-react';
import { useMail } from '@hooks/useMail';
import type { MailMessageDetail } from '@shared/types';
import { Button, IconButton, Spinner } from '@shared/ui';
import { sendMessage } from '@shared/messages';
import { useVault } from '@hooks/useVault';

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

function buildSandboxedHtml(html: string, allowRemote: boolean): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script,iframe,object,embed,form,input,button,meta,link,base,svg').forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith('on') || attribute.name === 'style') element.removeAttribute(attribute.name);
    }
  });
  document.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
    try {
      const url = new URL(anchor.href);
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) anchor.removeAttribute('href');
    } catch {
      anchor.removeAttribute('href');
    }
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  });
  if (!allowRemote) {
    document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      image.removeAttribute('src');
      image.removeAttribute('srcset');
      image.alt = image.alt ? `${image.alt} (remote image blocked)` : 'Remote image blocked';
    });
  }
  const imagePolicy = allowRemote ? "img-src data: blob: https:;" : "img-src data: blob:;";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imagePolicy} style-src 'unsafe-inline';"><style>body{background:#1d1f22;color:#f2f3f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:16px;margin:0;font-size:14px;line-height:1.6;overflow-wrap:anywhere}a{color:#8bb0ff}img{max-width:100%;height:auto}pre{overflow-x:auto;background:#25272b;padding:12px;border-radius:6px}table{border-collapse:collapse;max-width:100%}td,th{padding:4px 8px}</style></head><body>${document.body.innerHTML}</body></html>`;
}

export default function MessageViewer({ accountId, messageId, onBack }: MessageViewerProps) {
  const { getMessage, deleteMessage, loading, error } = useMail();
  const { vault } = useVault();
  const [message, setMessage] = useState<MailMessageDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allowRemote, setAllowRemote] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (vault && !vault.settings.blockRemoteMailContent) setAllowRemote(true);
  }, [vault]);

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
      return buildSandboxedHtml(message.html.join(''), allowRemote);
    }
    return null;
  }, [message, allowRemote]);

  const downloadAttachment = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    setDownloadError(null);
    try {
      const response = await sendMessage<{ data?: string; filename?: string; contentType?: string; error?: string }>({
        type: 'MAIL_DOWNLOAD_ATTACHMENT', accountId, messageId, attachmentId,
      });
      if (response.error || !response.data) throw new Error(response.error ?? 'Attachment download failed');
      const binary = atob(response.data);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: response.contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename || 'attachment';
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadFailure) {
      setDownloadError((downloadFailure as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

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
                <button
                  key={att.id}
                  type="button"
                  onClick={() => downloadAttachment(att.id)}
                  disabled={downloadingId === att.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-2 border border-border rounded-md text-xs text-text-secondary hover:text-text hover:border-border-strong transition-colors duration-150"
                >
                  <Paperclip size={12} />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <span className="text-text-muted">({formatFileSize(att.size)})</span>
                  <Download size={12} />
                </button>
              ))}
            </div>
          )}
          {downloadError && <p className="mt-2 text-xs text-danger">{downloadError}</p>}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {htmlContent ? (
            <div>
              {!allowRemote && (
                <Button size="sm" variant="secondary" className="mb-3" onClick={() => setAllowRemote(true)}>
                  <Image size={14} /> Load remote images
                </Button>
              )}
              <iframe
                srcDoc={htmlContent}
                sandbox=""
                title="Email content"
                className="h-[420px] w-full rounded-lg border border-border"
              />
            </div>
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
