import type { DragEvent } from 'react';

const SRCBOX_DRAG_MIME = 'application/x-srcbox-drag-item';

let activeDragItem: DragItem | null = null;

export type DragItem =
  | { type: 'note'; noteId: string }
  | { type: 'box'; boxPath: string };

export function setDragItem(event: DragEvent, item: DragItem): void {
  activeDragItem = item;
  const serialized = JSON.stringify(item);
  event.dataTransfer.setData(SRCBOX_DRAG_MIME, serialized);

  // Fallback so drag data still works if custom MIME is stripped.
  if (item.type === 'note') {
    event.dataTransfer.setData('text/plain', `note:${item.noteId}`);
  } else {
    event.dataTransfer.setData('text/plain', `box:${item.boxPath}`);
  }
}

export function clearDragItem(): void {
  activeDragItem = null;
}

export function getDragItem(event: DragEvent): DragItem | null {
  // During dragenter/dragover some runtimes (including Electron/Chromium variants)
  // do not expose getData() yet. Keep an in-memory copy from dragstart.
  if (activeDragItem) return activeDragItem;

  const customData = event.dataTransfer.getData(SRCBOX_DRAG_MIME);
  if (customData) {
    try {
      const parsed = JSON.parse(customData) as Partial<DragItem>;
      if (parsed.type === 'note' && typeof parsed.noteId === 'string') {
        return { type: 'note', noteId: parsed.noteId };
      }
      if (parsed.type === 'box' && typeof parsed.boxPath === 'string') {
        return { type: 'box', boxPath: parsed.boxPath };
      }
    } catch {
      // Invalid custom data
    }
  }

  return null;
}


export function getActiveDragItem(): DragItem | null {
  return activeDragItem;
}
