import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Book, BookChapter } from '../types';

interface BookmarkItem {
  id: string;
  chapterNumber: number;
  note: string;
  createdAt: string;
}

export const ReaderPage: React.FC<{ bookId: string; initialChapter?: number }> = ({
  bookId,
  initialChapter,
}) => {
  const { navigate, apiFetch, bootstrap, notify } = useApp();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [activeChapterNum, setActiveChapterNum] = useState<number>(initialChapter || 1);
  const [loading, setLoading] = useState(true);

  const [tocOpen, setTocOpen] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'night'>('paper');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');

  const readerContainerRef = useRef<HTMLDivElement>(null);

  const loadBook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
        setChapters(data.chapters || []);
        setBookmarks(data.bookmarks || []);
        if (!initialChapter && data.progress?.currentChapterNumber) {
          setActiveChapterNum(data.progress.currentChapterNumber);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, bookId, initialChapter]);

  useEffect(() => {
    void loadBook();
  }, [loadBook]);

  // Persist reading progress when authenticated
  useEffect(() => {
    if (!bootstrap?.user || !book) return;
    const pct = chapters.length > 0 ? Math.round((activeChapterNum / chapters.length) * 100) : 0;
    const timer = setTimeout(() => {
      void apiFetch(`/api/books/${book.id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          currentChapterNumber: activeChapterNum,
          scrollPercent: pct,
        }),
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [activeChapterNum, apiFetch, book, bootstrap?.user, chapters.length]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && readerContainerRef.current) {
      await readerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleAddBookmark = async () => {
    if (!bootstrap?.user) {
      notify('info', 'Connectez-vous pour enregistrer des signets.');
      return;
    }
    const res = await apiFetch(`/api/books/${bookId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({
        chapterNumber: activeChapterNum,
        note: bookmarkNote.trim() || `Signet au chapitre ${activeChapterNum}`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookmarks((prev) => [...prev, data.bookmark]);
      setBookmarkNote('');
      notify('success', 'Signet ajouté.');
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    const res = await apiFetch(`/api/books/${bookId}/bookmarks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const currentChapter =
    chapters.find((c) => c.chapterNumber === activeChapterNum) || chapters[0] || null;
  const isRtlBook = book?.languageCode === 'ar';

  const themeSurface =
    readerTheme === 'night'
      ? 'bg-[#0B0F1A] text-slate-200 border-slate-800'
      : readerTheme === 'sepia'
        ? 'bg-[#F5EFE6] text-[#2C241B] border-[#E5DAC8]'
        : 'bg-[#FFFFFF] text-[#0F172A] border-slate-200';

  const outerBg =
    readerTheme === 'night'
      ? 'bg-[#060911] text-slate-200'
      : readerTheme === 'sepia'
        ? 'bg-[#EDE4D5] text-[#2C241B]'
        : 'bg-[#F8F8FA] text-[#0F172A]';

  return (
    <div ref={readerContainerRef} className={`min-h-screen flex flex-col ${outerBg}`}>
      {/* Top Reader Toolbar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 sm:px-6 py-3 backdrop-blur-md bg-inherit">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate({ name: 'book-detail', bookId })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quitter</span>
          </button>
          <button
            type="button"
            onClick={() => setTocOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chapitres</span>
          </button>
          <div className="truncate font-display text-sm font-bold">{book?.title}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font size */}
          <div className="flex items-center gap-1 rounded-lg border border-current/15 px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              aria-label="Réduire la taille du texte"
              className="p-1 cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono tabular-nums px-1">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(26, s + 2))}
              aria-label="Augmenter la taille du texte"
              className="p-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Reading Theme */}
          <div className="flex items-center gap-1 rounded-lg border border-current/15 p-1 text-xs">
            <button
              type="button"
              onClick={() => setReaderTheme('paper')}
              className={`rounded px-2 py-1 cursor-pointer ${readerTheme === 'paper' ? 'bg-slate-900 text-white' : ''}`}
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('sepia')}
              className={`rounded px-2 py-1 cursor-pointer ${readerTheme === 'sepia' ? 'bg-amber-800 text-white' : ''}`}
            >
              Sépia
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('night')}
              className={`rounded px-2 py-1 cursor-pointer ${readerTheme === 'night' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Plein écran"
            className="rounded-lg border border-current/15 p-2 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Reader Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {tocOpen && (
          <aside className="w-72 shrink-0 border-e border-current/10 p-4 space-y-6 hidden md:block">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Table des matières
              </h2>
              <nav className="mt-3 space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChapterNum(ch.chapterNumber)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      ch.chapterNumber === activeChapterNum
                        ? 'bg-[#6D28D9] text-white'
                        : 'hover:bg-current/5'
                    }`}
                  >
                    <div className="opacity-70 text-[10px]">Chapitre {ch.chapterNumber}</div>
                    <div className="truncate">{ch.title}</div>
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-current/10 pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider opacity-60">Signets</h2>
              <div className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="Note rapide…"
                  className="w-full rounded-md border border-current/20 bg-transparent px-2.5 py-1.5 text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBookmark}
                  title="Ajouter un signet"
                  className="rounded-md bg-[#0F172A] text-white px-2.5 py-1.5 text-xs cursor-pointer"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-current/15 px-2.5 py-2 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveChapterNum(bm.chapterNumber)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="font-semibold">Ch. {bm.chapterNumber}</div>
                      <div className="truncate opacity-75">{bm.note}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      className="opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-8 lg:p-12">
          {loading ? (
            <div className="mx-auto max-w-3xl h-96 rounded-2xl border border-current/10 animate-pulse" />
          ) : !currentChapter ? (
            <div className="mx-auto max-w-3xl rounded-2xl border border-current/10 p-10 text-center">
              Ce livre ne contient pas encore de chapitres lisibles.
            </div>
          ) : (
            <article
              dir={isRtlBook ? 'rtl' : 'ltr'}
              className={`mx-auto max-w-3xl rounded-2xl border p-6 sm:p-12 shadow-xs ${themeSurface}`}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-[#6D28D9] dark:text-violet-400">
                Chapitre {currentChapter.chapterNumber} / {chapters.length}
              </div>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold leading-tight">
                {currentChapter.title}
              </h1>

              <div
                className="mt-8 book-prose"
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{
                  __html:
                    currentChapter.contentHtml ||
                    `<p>${currentChapter.summary || 'Contenu en cours de rédaction.'}</p>`,
                }}
              />

              {/* Chapter Pagination */}
              <div
                dir="ltr"
                className="mt-12 pt-6 border-t border-current/10 flex items-center justify-between gap-4"
              >
                <button
                  type="button"
                  disabled={activeChapterNum <= 1}
                  onClick={() => {
                    setActiveChapterNum((n) => Math.max(1, n - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-4 py-2 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Chapitre précédent</span>
                </button>

                <span className="font-mono text-xs tabular-nums opacity-70">
                  {activeChapterNum} / {chapters.length}
                </span>

                <button
                  type="button"
                  disabled={activeChapterNum >= chapters.length}
                  onClick={() => {
                    setActiveChapterNum((n) => Math.min(chapters.length, n + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                >
                  <span>Chapitre suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}
        </main>
      </div>
    </div>
  );
};
