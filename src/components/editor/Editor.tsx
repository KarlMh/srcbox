import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { MarkdownPreview } from './MarkdownPreview';
import { TagInput } from './TagInput';
import { Eye, Edit2, MoreHorizontal, ArrowLeft, Columns } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/date';

type ViewMode = 'edit' | 'preview' | 'live';

export function Editor() {
  const { currentNote, updateNote, setCurrentNote } = useNotesStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showActions, setShowActions] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSaveTimeout = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setTags(currentNote.tags);
    }
  }, [currentNote]);

  const persistNote = useCallback(
    async (noteId: string, newTitle: string, newContent: string, newTags: string[]) => {
      const isInit = useNotesStore.getState().isFileSystemInitialized;
      if (!isInit) {
        setSaveState('idle');
        return;
      }
      setSaveState('saving');
      try {
        await updateNote(noteId, {
          title: newTitle,
          content: newContent,
          tags: newTags,
        });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1200);
      } catch (error) {
        console.error('Save failed:', error);
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    },
    [updateNote]
  );

  const queueSave = useCallback(
    (newTitle: string, newContent: string, newTags: string[]) => {
      if (!currentNote) return;

      clearSaveTimeout();
      const noteId = currentNote._id;
      saveTimeoutRef.current = setTimeout(() => {
        void persistNote(noteId, newTitle, newContent, newTags);
      }, 350);
    },
    [currentNote, persistNote]
  );

  useEffect(() => {
    return () => {
      clearSaveTimeout();
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    queueSave(newTitle, content, tags);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    queueSave(title, newContent, tags);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    queueSave(title, content, newTags);
  };

  if (!currentNote) {
    return null;
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const headerTitle = title.trim() || 'Untitled';
  const headerSubtitle = `${wordCount} words · ${readingTime} min read`;

  const renderEditorTextarea = (className = '') => (
    <textarea
      value={content}
      onChange={handleContentChange}
      placeholder="Start writing..."
      className={cn(
        'w-full h-full resize-none bg-transparent outline-none px-3 sm:px-4 pb-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground leading-relaxed',
        className
      )}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        leftSlot={
          <button
            onClick={() => setCurrentNote(null)}
            className="rounded-lg p-2 transition-colors hover:bg-muted md:hidden"
            title="Back to notes"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        actions={
          <>
            <span className="hidden min-w-14 text-right text-xs text-muted-foreground sm:inline">
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved'}
              {saveState === 'error' && 'Save failed'}
            </span>

          <button
            onClick={() =>
              setViewMode((prev) => {
                if (prev === 'live') return 'edit';
                return prev === 'preview' ? 'edit' : 'preview';
              })
            }
            className={cn(
              'p-2 rounded-lg hover:bg-muted transition-colors',
              viewMode === 'preview' && 'bg-muted'
            )}
            title={viewMode === 'preview' ? 'Edit' : 'Preview'}
          >
            {viewMode === 'preview' ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setViewMode((prev) => (prev === 'live' ? 'edit' : 'live'))}
            className={cn(
              'p-2 rounded-lg hover:bg-muted transition-colors',
              viewMode === 'live' && 'bg-muted'
            )}
            title={viewMode === 'live' ? 'Exit live view' : 'Live view'}
          >
            <Columns className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-10">
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {wordCount} words · {readingTime} min read
                </div>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Created {formatDate(currentNote.createdAt)}
                </div>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Updated {formatDate(currentNote.updatedAt)}
                </div>
              </div>
            )}
          </div>
          </>
        }
      />

      {/* Title */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-xl sm:text-2xl font-semibold bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Tags */}
      <div className="px-3 sm:px-4 py-2">
        <TagInput tags={tags} onChange={handleTagsChange} />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'preview' ? (
          <div className="h-full overflow-y-auto px-3 sm:px-4 pb-4">
            <MarkdownPreview content={content} />
          </div>
        ) : viewMode === 'live' ? (
          <div className="h-full flex flex-col lg:flex-row">
            <div className="h-1/2 lg:h-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border overflow-hidden">
              {renderEditorTextarea()}
            </div>
            <div className="h-1/2 lg:h-full lg:w-1/2 overflow-y-auto px-3 sm:px-4 pb-4">
              <MarkdownPreview content={content} />
            </div>
          </div>
        ) : (
          renderEditorTextarea()
        )}
      </div>
    </div>
  );
}