import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Copy, Download, Image as ImageIcon, PenTool, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardShell } from '../components/DashboardShell';
import { BookCoverPreview } from '../components/BookCoverPreview';
import type { Book } from '../types';

type LibraryTab = 'all' | 'draft' | 'completed' | 'imported' | 'favorites';

export const MyLibraryPage: React.FC<{ initialTab?: LibraryTab }> = ({ initialTab = 'all' }) => {
  const { apiFetch, navigate, notify } = useApp();
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [books, setBooks] = useState<Book[]>([]);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'updated' | 'title' | 'words'>('updated');

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importLanguage, setImportLanguage] = useState('fr');
  const [importRawText, setImportRawText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/my/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
        setFavorites(data.favorites || []);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleDuplicate = async (bookId: string) => {
    const res = await apiFetch(`/api/books/${bookId}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      notify('success', 'Projet dupliqué avec succès.');
      void loadData();
    } else {
      notify('error', data.error || 'Impossible de dupliquer.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await apiFetch(`/api/books/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      notify('success', 'Livre supprimé.');
      setDeleteTarget(null);
      void loadData();
    } else {
      notify('error', 'Erreur lors de la suppression.');
    }
  };

  const handleQuickExport = async (book: Book, format: 'pdf' | 'epub') => {
    notify('info', `Génération du fichier ${format.toUpperCase()}…`);
    const res = await apiFetch(`/api/books/${book.id}/export`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      notify('error', err.error || 'Échec de l’export.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', `Fichier ${format.toUpperCase()} téléchargé.`);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md|markdown|html?)$/i.test(file.name)) {
      notify('error', 'Formats acceptés : .txt, .md, .html');
      return;
    }
    if (file.size > 500_000) {
      notify('error', 'Fichier trop volumineux (max 500 Ko).');
      return;
    }
    setImportFileName(file.name);
    if (!importTitle) setImportTitle(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setImportRawText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      const res = await apiFetch('/api/books/import', {
        method: 'POST',
        body: JSON.stringify({
          title: importTitle,
          languageCode: importLanguage,
          rawContent: importRawText,
          fileName: importFileName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Manuscrit importé et découpé en chapitres.');
        setShowImportModal(false);
        setImportRawText('');
        setImportTitle('');
        void loadData();
      } else {
        notify('error', data.error || 'Échec de l’importation.');
      }
    } finally {
      setImporting(false);
    }
  };

  const sourceList =
    tab === 'favorites'
      ? favorites
      : tab === 'draft'
        ? books.filter((b) => b.status === 'draft' || b.status === 'in_progress')
        : tab === 'completed'
          ? books.filter((b) => b.status === 'completed' || b.status === 'published')
          : tab === 'imported'
            ? books.filter((b) => b.isImported)
            : books;

  const filtered = sourceList
    .filter((b) => !search.trim() || b.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'words') return b.wordCount - a.wordCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <DashboardShell
      title={tab === 'favorites' ? 'Mes favoris' : 'Ma bibliothèque & projets'}
      breadcrumb="EBOOK STUDIO AI / Bibliothèque personnelle"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importer</span>
          </button>
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouvel eBook</span>
          </button>
        </div>
      }
    >
      {/* Tabs & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {[
            { id: 'all', label: 'Mes livres' },
            { id: 'draft', label: 'Brouillons' },
            { id: 'completed', label: 'Terminés' },
            { id: 'imported', label: 'Importés' },
            { id: 'favorites', label: 'Favoris' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as LibraryTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === item.id
                  ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par titre…"
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-xs focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'updated' | 'title' | 'words')}
            aria-label="Trier"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
          >
            <option value="updated">Récents</option>
            <option value="title">Titre (A–Z)</option>
            <option value="words">Nombre de mots</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <h3 className="font-display text-lg font-semibold">Aucun livre dans cette section</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez un nouvel eBook dans le studio ou importez un manuscrit existant.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((book) => (
            <div
              key={book.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-4"
            >
              <div className="flex gap-4">
                <div className="w-24 shrink-0">
                  <BookCoverPreview
                    title={book.title}
                    authorName={book.authorName}
                    coverImageUrl={book.coverImageUrl}
                    coverConfig={book.coverConfig}
                    compact
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{book.status}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase">{book.languageCode}</span>
                    {book.isPublic && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Public</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-base font-semibold line-clamp-2">
                    {book.title}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {book.wordCount.toLocaleString()} mots
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'reader', bookId: book.id })}
                    title="Lire"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Lire</span>
                  </button>
                  {tab !== 'favorites' && (
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'studio', bookId: book.id, tab: 'editor' })}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-2.5 py-1.5 text-xs font-medium text-white cursor-pointer"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      <span>Éditer</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickExport(book, 'pdf')}
                    title="Télécharger PDF"
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(book.id)}
                    title="Dupliquer"
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {tab !== 'favorites' && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(book)}
                      title="Supprimer"
                      className="rounded-md p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">Confirmer la suppression</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Voulez-vous supprimer définitivement « {deleteTarget.title} » et tous ses chapitres ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Manuscript Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleImportSubmit}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold">Importer un manuscrit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Importez un fichier .txt, .md ou .html (ou collez votre texte). Les titres commençant par # seront automatiquement convertis en chapitres.
            </p>

            <div>
              <label className="block text-xs font-medium mb-1">Fichier source (.txt, .md, .html)</label>
              <input
                type="file"
                accept=".txt,.md,.markdown,.html,.htm"
                onChange={handleFilePick}
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Titre du livre</label>
                <input
                  type="text"
                  required
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Langue</label>
                <select
                  value={importLanguage}
                  onChange={(e) => setImportLanguage(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Contenu du manuscrit</label>
              <textarea
                required
                rows={6}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="# Chapitre 1&#10;Votre texte ici…"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={importing}
                className="rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {importing ? 'Importation…' : 'Importer dans le studio'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
};
