import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from './cn';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'Search accounts and actions…',
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 50);
    return commands
      .map((c) => {
        const hay = `${c.title} ${c.subtitle ?? ''} ${c.keywords ?? ''}`.toLowerCase();
        const idx = hay.indexOf(q);
        return { c, idx };
      })
      .filter((r) => r.idx >= 0)
      .sort((a, b) => a.idx - b.idx)
      .slice(0, 50)
      .map((r) => r.c);
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = results[active];
      if (cmd) {
        onClose();
        cmd.run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-1 shadow-pop animate-pop-in">
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search size={16} className="text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="h-12 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">No results</p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                onMouseMove={() => setActive(i)}
                onClick={() => {
                  onClose();
                  c.run();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                  i === active ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                )}
              >
                {c.icon && (
                  <span className={cn('flex-shrink-0', i === active ? 'text-accent' : 'text-text-muted')}>
                    {c.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{c.title}</span>
                  {c.subtitle && (
                    <span className="block truncate text-[11px] text-text-muted">{c.subtitle}</span>
                  )}
                </span>
                {i === active && <CornerDownLeft size={13} className="text-text-muted" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Wire ⌘K / Ctrl-K to toggle a boolean. Returns [open, setOpen]. */
export function useCommandPaletteHotkey(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}
