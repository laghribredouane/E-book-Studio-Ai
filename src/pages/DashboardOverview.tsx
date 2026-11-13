import React, { useEffect, useState } from 'react';
import { BookOpen, Image as ImageIcon, PenTool, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardShell } from '../components/DashboardShell';
import { BookCoverPreview } from '../components/BookCoverPreview';
import type { Book } from '../types';

export const DashboardOverview: React.FC = () => {
  const { apiFetch, navigate, bootstrap, t } = useApp();
  const [books, setBooks] = useState<Book[]>([]);
  const [recentReading, setRecentReading] = useState<
    Array<{ book: Book; progress: { currentChapterNumber: number; scrollPercent: number } }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/my/books')
      .then((r) => (r.ok ? r.json() : { books: [], recentReading: [] }))
      .then((data) => {
        setBooks(data.books || []);
        setRecentReading(data.recentReading || []);
      })
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const inProgressCount = books.filter((b) => b.status === 'draft' || b.status === 'in_progress').length;
  const completedCount = books.filter((b) => b.status === 'completed' || b.status === 'published').length;
  const credits = bootstrap?.user?.creditBalance ?? 0;
  const notifications = bootstrap?.user?.notifications || [];

  return (
    <DashboardShell
      title={t.dashboardTitle}
      breadcrumb="EBOOK STUDIO AI / Dashboard"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ name: 'studio', tab: 'setup', mode: 'image' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#6D28D9] dark:text-violet-400" />
            <span className="hidden sm:inline">Depuis une image</span>
          </button>
          <button
            type="button"
            onClick={() => navigate({ name: 'studio', tab: 'setup' })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{t.newEbook}</span>
          </button>
        </div>
      }
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.booksCreated}</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums">{books.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.inProgress}</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums">{inProgressCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.completedBooks}</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums">{completedCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.creditsAvailable}</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#6D28D9] dark:text-violet-400">
            {credits.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Continue Reading + Recent Projects */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Derniers projets</h2>
            <button
              type="button"
              onClick={() => navigate({ name: 'projects' })}
              className="text-xs font-semibold text-[#6D28D9] dark:text-violet-400 hover:underline cursor-pointer"
            >
              Tout voir
            </button>
          </div>

          {loading ? (
            <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          ) : books.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <h3 className="font-display text-base font-semibold">Aucun projet d’eBook pour le moment</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Lancez votre premier manuscrit avec le plan structuré généré par Gemini.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate({ name: 'studio', tab: 'setup' })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Créer mon premier eBook</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'studio', tab: 'setup', mode: 'image' })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <ImageIcon className="h-4 w-4 text-[#6D28D9] dark:text-violet-400" />
                  <span>Créer depuis une image</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {books.slice(0, 4).map((book) => (
                <div
                  key={book.id}
                  className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                >
                  <div className="w-20 shrink-0">
                    <BookCoverPreview
                      title={book.title}
                      authorName={book.authorName}
                      coverImageUrl={book.coverImageUrl}
                      coverConfig={book.coverConfig}
                      compact
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {book.status} · {book.wordCount.toLocaleString()} mots
                      </div>
                      <h3 className="mt-1 font-display text-sm font-semibold truncate">{book.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'studio', bookId: book.id, tab: 'editor' })}
                        className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        <PenTool className="h-3 w-3" />
                        <span>Éditer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'reader', bookId: book.id })}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Lire</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentReading.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold">Reprendre la lecture</h2>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {recentReading.slice(0, 3).map((item) => (
                  <div key={item.book.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{item.book.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Chapitre {item.progress.currentChapterNumber} · {item.progress.scrollPercent}% lu
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          name: 'reader',
                          bookId: item.book.id,
                          chapter: item.progress.currentChapterNumber,
                        })
                      }
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      Reprendre
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-lg font-bold">Activité récente</h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {notifications.length === 0 ? (
              <div className="p-5 text-xs text-slate-500 dark:text-slate-400">
                Aucune notification récente.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4">
                  <div className="text-xs font-semibold">{n.title}</div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};
