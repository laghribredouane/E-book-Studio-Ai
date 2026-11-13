import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Grid, List, Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PublicHeader } from '../components/PublicHeader';
import { BookCoverPreview } from '../components/BookCoverPreview';
import type { Book } from '../types';

export const PublicLibraryPage: React.FC = () => {
  const { navigate, bootstrap, t } = useApp();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [language, setLanguage] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [sort, setSort] = useState<'popular' | 'newest' | 'title'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'all') params.set('category', category);
      if (language !== 'all') params.set('language', language);
      if (authorFilter.trim()) params.set('author', authorFilter.trim());
      params.set('sort', sort);

      const res = await fetch(`/api/books?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, language, authorFilter, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBooks();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadBooks]);

  return (
    <div className="min-h-screen bg-[#F8F8FA] dark:bg-[#0B0F1A] text-[#0F172A] dark:text-slate-100">
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{t.libraryTitle}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.librarySubtitle}</p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Affichage grille"
              className={`rounded-md p-2 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Affichage liste"
              className={`rounded-md p-2 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-sm focus:border-[#6D28D9] focus:outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Catégorie"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="all">Toutes catégories</option>
            {(bootstrap?.categories || []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Langue du livre"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="all">Toutes langues</option>
            {(bootstrap?.languages || []).map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="text"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              placeholder="Auteur…"
              className="w-1/2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:outline-none"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'popular' | 'newest' | 'title')}
              aria-label="Trier par"
              className="w-1/2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2.5 text-sm focus:outline-none"
            >
              <option value="popular">Popularité</option>
              <option value="newest">Nouveauté</option>
              <option value="title">Titre (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 font-display text-lg font-semibold">Aucun livre trouvé</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ajustez vos filtres ou publiez le premier ouvrage de cette catégorie depuis le Studio.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setLanguage('all');
                setAuthorFilter('');
              }}
              className="mt-5 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate({ name: 'book-detail', bookId: book.id })}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <BookCoverPreview
                    title={book.title}
                    subtitle={book.subtitle}
                    authorName={book.authorName}
                    coverImageUrl={book.coverImageUrl}
                    coverConfig={book.coverConfig}
                  />
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{book.categorySlug}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase">{book.languageCode}</span>
                    {book.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Démo</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] dark:text-white line-clamp-2 group-hover:text-[#6D28D9] dark:group-hover:text-violet-400">
                    {book.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {book.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="truncate">{book.authorName}</span>
                  <span className="shrink-0">{book.wordCount.toLocaleString()} mots</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {books.map((book) => (
              <div
                key={book.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-16 shrink-0">
                    <BookCoverPreview
                      title={book.title}
                      authorName={book.authorName}
                      coverImageUrl={book.coverImageUrl}
                      coverConfig={book.coverConfig}
                      compact
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{book.categorySlug}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">{book.languageCode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{book.wordCount.toLocaleString()} mots</span>
                      {book.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Démo</span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold">{book.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {book.description}
                    </p>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Par {book.authorName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'book-detail', bookId: book.id })}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Fiche
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'reader', bookId: book.id })}
                    className="rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    {t.readBook}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
