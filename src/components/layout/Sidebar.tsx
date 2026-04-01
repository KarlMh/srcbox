import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Trash2,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Tag,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { useNotesStore } from '../../stores/notesStore';
import { useUIStore } from '../../stores/uiStore';
import { notesDb } from '../../db/database';
import { NoteItem } from '../notes/NoteItem';
import { BoxItem, BoxNode } from '../notes/BoxItem';
import { Note, Box } from '../../types/note';
import { cn } from '../../utils/cn';
import { getDragItem } from '../../utils/dragData';
import { dragState, useActiveDragPath } from '../../utils/dragState';

function buildTree(boxes: Box[], notes: Note[], parentPath: string | null): BoxNode[] {
  return boxes
    .filter((b) => b.parentPath === parentPath)
    .map((box) => ({
      box,
      notes: notes.filter((n) => n.boxPath === box.path),
      children: buildTree(boxes, notes, box.path),
    }));
}

export function Sidebar() {
  const navigate = useNavigate();
  const { tag: urlTag } = useParams();
  const {
    createNote,
    createBox,
    moveNote,
    moveBox,
    setCurrentNote,
    notes,
    boxes,
    isLoading,
    selectedTag,
    setSelectedTag,
    openFoldersForTag,
    searchQuery,
    setSearchQuery,
  } = useNotesStore();
  const location = useLocation();
const { sidebarOpen, toggleSidebar, toggleTheme, theme } = useUIStore();
  const trashClickGuard = useRef(false);
  const settingsClickGuard = useRef(false);
  const [isNavigatingTrash, setIsNavigatingTrash] = useState(false);
  const [isNavigatingSettings, setIsNavigatingSettings] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [creatingBox, setCreatingBox] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const activeDragPath = useActiveDragPath();
  const isRootDropActive = activeDragPath === 'ROOT';
  const newBoxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useNotesStore.getState().isFileSystemInitialized) {
      loadTags();
    }
  }, [notes]);

  useEffect(() => {
    if (urlTag) setSelectedTag(urlTag);
  }, [urlTag, setSelectedTag]);

  useEffect(() => {
    if (creatingBox) {
      setTimeout(() => newBoxInputRef.current?.focus(), 30);
    }
  }, [creatingBox]);


  const loadTags = async () => {
    const allTags = await notesDb.getAllTags();
    setTags(allTags);
  };

  const handleNewNote = async () => {
    try {
      navigate('/');
      const note = await createNote({ title: '', content: '' });
      setCurrentNote(note);
      await new Promise(resolve => setTimeout(resolve, 100));
      useNotesStore.getState().loadNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      if (error instanceof Error && error.message !== 'Please select a folder first') {
        alert('Failed to create note. Please try again.');
      }
    }
  };

  const commitNewBox = async () => {
    const name = newBoxName.trim();
    setCreatingBox(false);
    setNewBoxName('');
    if (!name) return;
    try {
      await createBox(null, name);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleTagClick = async (tag: string) => {
    if (urlTag === tag) {
      setSelectedTag(null);
      navigate('/');
    } else {
      setSelectedTag(tag);
      navigate(`/tag/${tag}`);
      await openFoldersForTag(tag);
    }
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
    navigate('/');
  };

  const handleRootDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const item = getDragItem(e);
    if (!item) return;
    const isInsideBox = (e.target as HTMLElement).closest('[data-box-item="true"]') !== null;
    if (isInsideBox) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragState.set('ROOT');
  };

  const handleRootDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (!nextTarget || !e.currentTarget.contains(nextTarget)) {
      dragState.set(null);
    }
  };

  const handleRootDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    const item = getDragItem(e);
    if (!item) return;
    const isInsideBox = (e.target as HTMLElement).closest('[data-box-item="true"]') !== null;
    if (isInsideBox) return;
    e.preventDefault();
    dragState.set(null);
    try {
      if (item.type === 'note') { await moveNote(item.noteId, null); return; }
      await moveBox(item.boxPath, null);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Root notes (no box) and box tree
  const rootNotes = notes.filter((n) => !n.boxPath);
  const fullTree = buildTree(boxes, notes, null);

  // When a tag is selected, hide boxes that have no matching notes
  const tree = useMemo(() => {
    if (!selectedTag) return fullTree;
    function filter(nodes: BoxNode[]): BoxNode[] {
      return nodes.reduce<BoxNode[]>((acc, node) => {
        const filteredChildren = filter(node.children);
        if (node.notes.length > 0 || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    }
    return filter(fullTree);
  }, [fullTree, selectedTag]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-50 h-full w-[min(85vw,18rem)] md:w-72 bg-card border-r border-border flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header — also serves as drag region in Electron */}
        <div className="app-drag-region flex items-center justify-between gap-3 border-b border-border p-3 sm:p-4">
          <h1 className="truncate text-lg font-semibold sm:text-xl">srcbox</h1>
          <button onClick={toggleSidebar} className="app-no-drag md:hidden p-1 rounded-md hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Note + New Box buttons */}
        <div className="p-3 sm:p-4 pb-2 flex gap-2">
          <button
            onClick={handleNewNote}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
          <button
            onClick={() => setCreatingBox(true)}
            className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="New box"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 sm:px-4 mb-2">
          {searchOpen ? (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="p-1 hover:bg-background rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search</span>
            </button>
          )}
        </div>

        {/* Notes + Boxes tree */}
        <div 
          className={cn(
            'flex-1 min-h-0 overflow-y-auto transition-all duration-200',
            isRootDropActive && 'ring-2 ring-primary/20 [&:not([data-dragging])]::before:block [&:not([data-dragging])]::before:absolute [&:not([data-dragging])]::before:inset-x-0 [&:not([data-dragging])]::before:top-0 [&:not([data-dragging])]::before:h-1 [&:not([data-dragging])]::before:bg-gradient-to-r [&:not([data-dragging])]::before:from-transparent [&:not([data-dragging])]::before:via-primary/50 [&:not([data-dragging])]::before:to-transparent'
          )}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-0.5 rounded-lg">
              {/* Inline new-box input */}
              {creatingBox && (
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted">
                  <FolderPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={newBoxInputRef}
                    value={newBoxName}
                    onChange={(e) => setNewBoxName(e.target.value)}
                    onBlur={commitNewBox}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitNewBox();
                      if (e.key === 'Escape') { setCreatingBox(false); setNewBoxName(''); }
                    }}
                    placeholder="Box name"
                    className="flex-1 text-sm bg-transparent outline-none"
                  />
                </div>
              )}

              {/* Root-level notes (no box) */}
              {rootNotes.map((note) => (
                <NoteItem key={note._id} note={note} indentLevel={2.3} />
              ))}

              {/* Box tree */}
              {tree.map((node) => (
                <BoxItem key={node.box.path} node={node} level={0} />
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-4 px-2 pb-2">
              <div className="px-3 mb-1.5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tags
                </h3>
{(urlTag || selectedTag) && (
                  <button
                    onClick={clearTagFilter}
                    className="p-1.5 bg-accent/30 hover:bg-accent/50 rounded-md transition-colors text-accent-foreground"
                    title={`Clear filter: ${urlTag || selectedTag}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      urlTag === tag || selectedTag === tag
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Tag className="h-4 w-4" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              if (location.pathname === '/trash' || trashClickGuard.current) return;
              trashClickGuard.current = true;
              setIsNavigatingTrash(true);
              navigate('/trash');
              setTimeout(() => {
                trashClickGuard.current = false;
                setIsNavigatingTrash(false);
              }, 300);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isNavigatingTrash ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={() => {
              if (location.pathname === '/settings' || settingsClickGuard.current) return;
              settingsClickGuard.current = true;
              setIsNavigatingSettings(true);
              navigate('/settings');
              setTimeout(() => {
                settingsClickGuard.current = false;
                setIsNavigatingSettings(false);
              }, 300);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isNavigatingSettings ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu button */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-3 z-40 md:hidden p-2 bg-card border border-border rounded-lg shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
