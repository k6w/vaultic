import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { sendMessage } from '@shared/messages';
import { sortAccounts } from '@shared/accounts';
import type { TwoFactorAccount } from '@shared/types';
import { Modal, Button, ServiceIcon } from '@shared/ui';

/** Drag-to-reorder overlay (keyboard-accessible) that persists sortOrder. */
export default function ReorderModal({
  accounts,
  onSaved,
  onClose,
}: {
  accounts: TwoFactorAccount[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<TwoFactorAccount[]>(() => sortAccounts(accounts));
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((a) => a.id === active.id);
      const to = prev.findIndex((a) => a.id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const save = async () => {
    setSaving(true);
    await sendMessage({ type: 'REORDER_ACCOUNTS', orderedIds: items.map((a) => a.id) });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Reorder accounts"
      description="Drag to set the order. Pinned accounts still surface first."
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save order'}
          </Button>
        </>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {items.map((a) => (
              <SortableItem key={a.id} account={a} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  );
}

function SortableItem({ account }: { account: TwoFactorAccount }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border border-border bg-surface-1 px-2.5 py-2 ${
        isDragging ? 'opacity-70 shadow-pop' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-text-muted hover:text-text active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <ServiceIcon issuer={account.issuer} icon={account.icon} size={26} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{account.issuer}</p>
        {account.label && <p className="truncate text-[11px] text-text-muted">{account.label}</p>}
      </div>
    </div>
  );
}
