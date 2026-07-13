import { useState } from 'react';
import { Plus, Trash2, Folder as FolderIcon, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage } from '@shared/messages';
import type { Folder } from '@shared/types';
import { Modal, Input, Button, IconButton, EmptyState, cn } from '@shared/ui';

const FOLDER_COLORS = [
  '#34e0a1', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#f59e0b', '#14b8a6', '#6366f1',
];

export default function FolderManager({
  folders,
  onChanged,
  onClose,
}: {
  folders: Folder[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const sorted = [...folders].sort((a, b) => a.order - b.order);

  const addFolder = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const folder: Folder = {
      id: uuidv4(),
      name: trimmed,
      color,
      order: folders.length,
    };
    await sendMessage({ type: 'ADD_FOLDER', folder });
    setName('');
    setBusy(false);
    onChanged();
  };

  const rename = async (folder: Folder, newName: string) => {
    await sendMessage({ type: 'UPDATE_FOLDER', folder: { ...folder, name: newName } });
    onChanged();
  };

  const remove = async (id: string) => {
    await sendMessage({ type: 'DELETE_FOLDER', folderId: id });
    onChanged();
  };

  return (
    <Modal open onClose={onClose} title="Folders" description="Group accounts into collections." size="sm">
      <div className="space-y-4">
        {/* New folder */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFolder()}
              placeholder="New folder name"
            />
            <Button size="md" onClick={addFolder} disabled={!name.trim() || busy}>
              <Plus size={16} /> Add
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full transition-transform',
                  color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface-1' : ''
                )}
                style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              >
                {color === c && <Check size={13} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Existing folders */}
        {sorted.length === 0 ? (
          <EmptyState
            icon={<FolderIcon size={22} />}
            title="No folders yet"
            description="Create a folder above to start organizing."
          />
        ) : (
          <div className="space-y-1">
            {sorted.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover">
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: f.color }} />
                <input
                  defaultValue={f.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && rename(f, e.target.value.trim())}
                  className="flex-1 bg-transparent text-sm text-text focus:outline-none"
                />
                <IconButton label="Delete folder" size="sm" variant="ghost" onClick={() => remove(f.id)}>
                  <Trash2 size={14} className="text-text-muted hover:text-danger" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
