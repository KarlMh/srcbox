import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal } from 'lucide-react';
import { Note, Box as BoxType } from '../../types/note';
import { useNotesStore } from '../../stores/notesStore';
import { NoteItem } from './NoteItem';
import { ConfirmDialog } from '../modals/ConfirmDialog';
import { cn } from '../../utils/cn';
import { clearDragItem, getDragItem, setDragItem } from '../../utils/dragData';
import { dragState, useActiveDragPath } from '../../utils/dragState';

export interface BoxNode {
  box: BoxType;
  notes: Note[];
  children: BoxNode[];
}

interface BoxItemProps {
  node: BoxNode;
  level?: number;
}

export function BoxItem({ node, level = 0 }: BoxItemProps) {
  const { createNote, createBox, renameBox, deleteBox, moveNote, moveBox, expandedBoxes, toggleBoxExpanded } = useNotesStore();
  const expanded = expandedBoxes[node.box.path] ?? true;
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.box.name);
  const [creatingSubBox, setCreatingSubBox] = useState(false);
  const [subBoxName, setSubBoxName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const activeDragPath = useActiveDragPath();
  const isDragOver = activeDragPath === node.box.path;
  const [isDraggingBox, setIsDraggingBox] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const subBoxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  useEffect(() => {
    if (creatingSubBox) {
      setTimeout(() => subBoxInputRef.current?.focus(), 30);
    }
  }, [creatingSubBox]);

  // ── Drag-and-drop ────────────────────────────────────────────────────────────

  const canAcceptDragItem = (item: ReturnType<typeof getDragItem>): boolean => {
    if (!item) return false;
    if (item.type === 'note') return true;
    if (item.type === 'box') {
      if (item.boxPath === node.box.path) return false;
      if (node.box.path.startsWith(item.boxPath + '/')) return false;
      return true;
    }
    return false;
  };

  const handleBoxDragStart = (e: React.DragEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('button, input')) {
      e.preventDefault();
      return;
    }
    setDragItem(e, { type: 'box', boxPath: node.box.path });
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingBox(true);
  };

  const handleBoxDragEnd = () => {
    setIsDraggingBox(false);
    dragState.set(null);
    clearDragItem();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    const item = getDragItem(e);
    if (!item) return;
    e.preventDefault();
    const innermost = (e.target as HTMLElement).closest('[data-box-item="true"]');
    if (innermost !== e.currentTarget) return; // entered via a nested box
    if (canAcceptDragItem(item)) {
      dragState.set(node.box.path);
      if (!expanded) toggleBoxExpanded(node.box.path);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    const item = getDragItem(e);
    if (!item) return;
    e.preventDefault();
    const innermost = (e.target as HTMLElement).closest('[data-box-item="true"]');
    if (innermost !== e.currentTarget) return;
    const canDrop = canAcceptDragItem(item);
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
    if (canDrop) dragState.set(node.box.path);
  };

  const handleDrop = async (e: React.DragEvent) => {
    const item = getDragItem(e);
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.set(null);
    if (!canAcceptDragItem(item)) return;
    try {
      if (item.type === 'note') {
        await moveNote(item.noteId, node.box.path);
        return;
      }
      await moveBox(item.boxPath, node.box.path);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // ── Note / Sub-box creation ──────────────────────────────────────────────────

  const handleNewNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) toggleBoxExpanded(node.box.path);
    await createNote({ title: '', content: '', boxPath: node.box.path });
  };

  const handleNewSubBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!expanded) toggleBoxExpanded(node.box.path);
    setCreatingSubBox(true);
    setSubBoxName('');
  };

  const commitSubBox = async () => {
    const name = subBoxName.trim();
    setCreatingSubBox(false);
    setSubBoxName('');
    if (!name) return;
    await createBox(node.box.path, name);
  };

  // ── Rename ───────────────────────────────────────────────────────────────────

  const handleRename = () => {
    setMenuOpen(false);
    setRenaming(true);
  };

  const commitRename = async () => {
    setRenaming(false);
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === node.box.name) {
      setRenameValue(node.box.name);
      return;
    }
    try {
      await renameBox(node.box.path, trimmed);
    } catch {
      setRenameValue(node.box.name);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const executeDelete = async () => {
    try {
      await deleteBox(node.box.path);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  const indent = level * 12;
  const hasChildren = node.notes.length > 0 || node.children.length > 0 || creatingSubBox;

  return (
    <div
      data-box-item="true"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}

      onDrop={handleDrop}
    >
      {/* Box row */}
      <div
        draggable={!renaming}
        onDragStart={handleBoxDragStart}
        onDragEnd={handleBoxDragEnd}
          className={cn(
          'group relative flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer select-none transition-all duration-200',
          isDragOver && 'ring-1 ring-primary/30 [&:not([data-dragging])]::after:block [&:not([data-dragging])]::after:absolute [&:not([data-dragging])]::after:inset-x-0 [&:not([data-dragging])]::after:bottom-0 [&:not([data-dragging])]::after:h-px [&:not([data-dragging])]::after:bg-gradient-to-r [&:not([data-dragging])]::after:from-transparent [&:not([data-dragging])]::after:via-primary/60 [&:not([data-dragging])]::after:to-transparent',
          isDraggingBox && 'opacity-50'
        )}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => toggleBoxExpanded(node.box.path)}
      >
        <span className="text-muted-foreground shrink-0">
          {hasChildren
            ? expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            : <span className="inline-block w-3.5" />}
        </span>

        <span className={cn('shrink-0', isDragOver ? 'text-primary' : 'text-muted-foreground')}>
          {expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
        </span>

        {renaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenaming(false); setRenameValue(node.box.name); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-transparent outline-none border-b border-primary"
          />
        ) : (
          <span className="flex-1 text-sm truncate">{node.box.name}</span>
        )}

        {/* Hover actions */}
        {!renaming && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleNewNote}
              className="p-1 rounded hover:bg-background text-muted-foreground"
              title="New note in box"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className={cn('p-1 rounded hover:bg-background text-muted-foreground', menuOpen && 'opacity-100 bg-background')}
                title="Box options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                  <button
                    onClick={handleNewSubBox}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    New sub-box
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Rename
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    Delete box
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

{confirmOpen && (
        <ConfirmDialog
          title={`Delete "${node.box.name}"?`}
          message="This box and all contents will be permanently deleted."
          onConfirm={() => { setConfirmOpen(false); executeDelete(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Children */}
      {expanded && (
        <div>
          {creatingSubBox && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted"
              style={{ paddingLeft: (level + 1) * 12 + 8 }}
            >
              <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={subBoxInputRef}
                value={subBoxName}
                onChange={(e) => setSubBoxName(e.target.value)}
                onBlur={commitSubBox}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSubBox();
                  if (e.key === 'Escape') { setCreatingSubBox(false); setSubBoxName(''); }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Box name"
                className="flex-1 text-sm bg-transparent outline-none"
              />
            </div>
          )}
          {node.notes.map((note) => (
            <NoteItem key={note._id} note={note} indentLevel={level + 3.4} />
          ))}
          {node.children.map((child) => (
            <BoxItem key={child.box.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
