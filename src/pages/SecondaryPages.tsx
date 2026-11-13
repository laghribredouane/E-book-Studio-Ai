import React, { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  Image as ImageIcon,
  LayoutTemplate,
  MailCheck,
  Moon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Type,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardShell } from '../components/DashboardShell';
import { SUPPORTED_LOCALES } from '../i18n/translations';
import { resendVerificationEmail } from '../lib/firebase';
import { STUDIO_COVER_ASSETS, STUDIO_ILLUSTRATION_ASSETS } from '../lib/studioAssets';
import type { Book, BookImage, BookTemplate, PdfStandard } from '../types';

export const IllustrationsGalleryPage: React.FC = () => {
  const { apiFetch, navigate, notify } = useApp();
  const [images, setImages] = useState<BookImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/my/images')
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => setImages(d.images || []))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify('success', 'Prompt copié dans le presse-papiers.');
    } catch {
      notify('info', prompt);
    }
  };

  return (
    <DashboardShell
      title="Galerie d’illustrations IA"
      breadcrumb="EBOOK STUDIO AI / Illustrations"
      action={
        <button
          type="button"
          onClick={() => navigate({ name: 'studio', tab: 'illustrations' })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Créer dans le Studio</span>
        </button>
      }
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Mes illustrations générées ({images.length})</h2>
          </div>

          {loading ? (
            <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          ) : images.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Vous n’avez pas encore généré d’illustration personnalisée. Ouvrez le Studio pour en créer avec Gemini ou utilisez la collection éditoriale ci-dessous.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    referrerPolicy="no-referrer"
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {img.kind} · {img.style}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{img.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">Illustrations éditoriales de chapitres</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visuels intégrables directement dans vos chapitres depuis l’éditeur ou l’onglet Illustrations du Studio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STUDIO_ILLUSTRATION_ASSETS.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3"
              >
                <img
                  src={asset.url}
                  alt={asset.title}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <div>
                  <div className="font-display text-sm font-bold">{asset.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {asset.style} · {asset.aspect}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{asset.prompt}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'studio', tab: 'illustrations' })}
                    className="flex-1 rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                  >
                    Ouvrir dans Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(asset.prompt)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                  >
                    Prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">Œuvres de couverture disponibles</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Couvertures haute définition sélectionnables dans le Concepteur de couverture.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {STUDIO_COVER_ASSETS.map((cover) => (
              <div
                key={cover.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5"
              >
                <img
                  src={cover.url}
                  alt={cover.title}
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
                <div className="font-display text-xs font-bold truncate">{cover.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{cover.style}</div>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'studio', tab: 'cover' })}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold hover:border-[#6D28D9] cursor-pointer"
                >
                  Utiliser en couverture
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export const TemplatesPage: React.FC = () => {
  const { bootstrap, apiFetch, navigate, notify } = useApp();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const handleUseTemplate = async (tpl: BookTemplate) => {
    setCreatingId(tpl.id);
    try {
      const res = await apiFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify({
          title: `Nouveau livre — ${tpl.name}`,
          subtitle: tpl.description,
          categorySlug: tpl.category || 'literature',
          coverConfig: tpl.coverConfig,
          layoutConfig: tpl.layoutConfig,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Projet initialisé avec ce modèle.');
        navigate({ name: 'studio', bookId: data.book.id, tab: 'setup' });
      } else {
        notify('error', data.error || 'Impossible de créer le projet.');
      }
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <DashboardShell title="Modèles éditoriaux" breadcrumb="EBOOK STUDIO AI / Templates">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(bootstrap?.templates || []).map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tpl.category} · {tpl.layoutConfig.pageFormat} ·{' '}
                  {tpl.isPremium ? 'Modèle Pro' : 'Standard'}
                </div>
                <h2 className="mt-1 font-display text-lg font-bold">{tpl.name}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{tpl.description}</p>
              </div>
              <div
                className="h-14 w-11 shrink-0 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                style={{
                  backgroundColor: tpl.coverConfig.backgroundColor,
                  color: tpl.coverConfig.textColor,
                }}
              >
                <LayoutTemplate className="h-4 w-4" />
              </div>
            </div>

            <button
              type="button"
              disabled={creatingId === tpl.id}
              onClick={() => handleUseTemplate(tpl)}
              className="w-full rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              {creatingId === tpl.id ? 'Création…' : 'Utiliser ce modèle'}
            </button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
};

export const ExportCenterPage: React.FC = () => {
  const { apiFetch, notify } = useApp();
  const [books, setBooks] = useState<Book[]>([]);
  const [exportsList, setExportsList] = useState<
    Array<{
      id: string;
      bookTitle: string;
      format: string;
      fileName: string;
      fileSizeBytes: number;
      createdAt: string;
    }>
  >([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [pdfFontFamily, setPdfFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [pdfMarginMm, setPdfMarginMm] = useState<number>(20);
  const [pdfStandard, setPdfStandard] = useState<PdfStandard>('standard');
  const [busyFormat, setBusyFormat] = useState<string | null>(null);

  const selectedBook = books.find((b) => b.id === selectedBookId) || null;

  const syncLayoutDefaults = (targetBook?: Book | null) => {
    if (!targetBook) return;
    const f = targetBook.layoutConfig?.fontFamily;
    setPdfFontFamily(f === 'sans' || f === 'mono' ? f : 'serif');
    const m = Number(targetBook.layoutConfig?.marginMm);
    setPdfMarginMm(Number.isFinite(m) ? Math.min(40, Math.max(10, Math.round(m))) : 20);
  };

  const loadAll = async () => {
    const [bRes, eRes] = await Promise.all([apiFetch('/api/my/books'), apiFetch('/api/my/exports')]);
    if (bRes.ok) {
      const bd = await bRes.json();
      const loadedBooks = (bd.books || []) as Book[];
      setBooks(loadedBooks);
      if (loadedBooks[0] && !selectedBookId) {
        setSelectedBookId(loadedBooks[0].id);
        syncLayoutDefaults(loadedBooks[0]);
      }
    }
    if (eRes.ok) {
      const ed = await eRes.json();
      setExportsList(ed.exports || []);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    const match = books.find((b) => b.id === bookId);
    syncLayoutDefaults(match);
  };

  const triggerExport = async (format: 'pdf' | 'epub' | 'html' | 'docx') => {
    if (!selectedBookId) return;
    setBusyFormat(format);
    try {
      const res = await apiFetch(`/api/books/${selectedBookId}/export`, {
        method: 'POST',
        body: JSON.stringify({
          format,
          fontFamily: pdfFontFamily,
          marginMm: pdfMarginMm,
          pdfStandard: format === 'pdf' ? pdfStandard : 'standard',
        }),
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
      const slug =
        selectedBook?.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-|-$/g, '') || 'ebook-export';
      const pdfSuffix =
        format === 'pdf' && pdfStandard !== 'standard'
          ? `-${pdfStandard.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          : '';
      a.download = `${slug}${pdfSuffix}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      notify(
        'success',
        `Export ${format === 'pdf' && pdfStandard !== 'standard' ? pdfStandard : format.toUpperCase()} terminé.`
      );
      void loadAll();
    } finally {
      setBusyFormat(null);
    }
  };

  const fontOptions: Array<{
    id: 'serif' | 'sans' | 'mono';
    label: string;
    desc: string;
    previewClass: string;
  }> = [
    {
      id: 'serif',
      label: 'Serif',
      desc: 'Classique littéraire (Times)',
      previewClass: 'font-serif',
    },
    {
      id: 'sans',
      label: 'Sans',
      desc: 'Moderne & épurée (Helvetica)',
      previewClass: 'font-sans',
    },
    {
      id: 'mono',
      label: 'Mono',
      desc: 'Chasse fixe technique (Courier)',
      previewClass: 'font-mono',
    },
  ];

  const marginPresets = [
    { label: 'Étroites', mm: 12 },
    { label: 'Standard', mm: 20 },
    { label: 'Confort', mm: 26 },
    { label: 'Larges', mm: 34 },
  ];

  const previewPaddingPx = Math.round(8 + ((pdfMarginMm - 10) / 30) * 20);
  const previewFontClass =
    pdfFontFamily === 'sans' ? 'font-sans' : pdfFontFamily === 'mono' ? 'font-mono' : 'font-serif';

  return (
    <DashboardShell title="Centre d’exportation" breadcrumb="EBOOK STUDIO AI / Export Center">
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Générer un nouveau fichier</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sélectionnez un ouvrage, personnalisez la typographie et les marges, puis générez votre fichier.
              </p>
            </div>
            <select
              value={selectedBookId}
              onChange={(e) => handleSelectBook(e.target.value)}
              aria-label="Livre à exporter"
              className="min-w-[260px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              {books.length === 0 ? (
                <option value="">Aucun livre disponible</option>
              ) : (
                books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* PDF Font & Margin Customization */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5">
            <div className="lg:col-span-8 space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Type className="h-3.5 w-3.5 text-[#6D28D9] dark:text-violet-400" />
                  <span>Police de caractères (PDF & rendu texte)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {fontOptions.map((opt) => {
                    const active = pdfFontFamily === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPdfFontFamily(opt.id)}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#6D28D9] bg-white dark:bg-slate-900 ring-2 ring-[#6D28D9]/25'
                            : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className={`text-lg font-bold ${opt.previewClass}`}>Aa</span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6D28D9] dark:text-violet-400">
                            {opt.label}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#6D28D9] dark:text-violet-400" />
                    <span>Taille des marges PDF</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#6D28D9] dark:text-violet-400 tabular-nums">
                    {pdfMarginMm} mm
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {marginPresets.map((preset) => {
                    const active = pdfMarginMm === preset.mm;
                    return (
                      <button
                        key={preset.mm}
                        type="button"
                        onClick={() => setPdfMarginMm(preset.mm)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#6D28D9] bg-[#6D28D9] text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {preset.label} ({preset.mm} mm)
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-slate-500 font-mono">10 mm</span>
                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={pdfMarginMm}
                    onChange={(e) => setPdfMarginMm(Number(e.target.value))}
                    aria-label="Taille des marges en millimètres"
                    className="flex-1 accent-[#6D28D9] cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">40 mm</span>
                </div>
              </div>

              {/* PDF/A ISO Archival Standard */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#6D28D9] dark:text-violet-400" />
                    <span>Archivage longue durée & Norme ISO (PDF/A)</span>
                  </div>
                  {pdfStandard !== 'standard' && (
                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                      {pdfStandard} actif
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'standard', label: 'PDF Standard', iso: 'Usage courant' },
                      { id: 'PDF/A-1b', label: 'PDF/A-1b', iso: 'ISO 19005-1' },
                      { id: 'PDF/A-2b', label: 'PDF/A-2b', iso: 'ISO 19005-2' },
                      { id: 'PDF/A-3b', label: 'PDF/A-3b', iso: 'ISO 19005-3' },
                    ] as const
                  ).map((std) => {
                    const active = pdfStandard === std.id;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => setPdfStandard(std.id)}
                        className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#6D28D9] bg-white dark:bg-slate-900 ring-2 ring-[#6D28D9]/25'
                            : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-xs font-semibold">{std.label}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {std.iso}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {pdfStandard !== 'standard' && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Garantit l’archivage pérenne : polices TrueType intégralement incorporées, profil colorimétrique{' '}
                    <span className="font-mono">sRGB IEC61966-2.1</span> et métadonnées XMP conformes{' '}
                    <span className="font-mono">{pdfStandard}</span>
                    {pdfStandard === 'PDF/A-1b' ? ' (couverture opaque sans transparence).' : '.'}
                  </p>
                )}
              </div>
            </div>

            {/* Live PDF Page Proportion Preview */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Aperçu mise en page PDF
              </div>
              <div
                className="w-44 aspect-[210/297] rounded-lg border border-slate-300 dark:border-slate-700 bg-white text-slate-900 shadow-sm flex flex-col justify-between transition-all"
                style={{ padding: `${previewPaddingPx}px` }}
              >
                <div className={`border border-dashed border-slate-200 flex-1 p-2 ${previewFontClass}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-[#6D28D9] font-semibold">
                      Chapitre 1
                    </span>
                    {pdfStandard !== 'standard' && (
                      <span className="rounded bg-emerald-100 px-1 py-0.5 font-mono text-[6px] font-bold text-emerald-800">
                        {pdfStandard}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold leading-tight line-clamp-2">
                    {selectedBook?.title || 'Titre de votre eBook'}
                  </div>
                  <p className="mt-1.5 text-[7.5px] leading-relaxed text-slate-600">
                    La mise en page s’ajuste dynamiquement selon votre choix de police ({pdfFontFamily}) et de marges ({pdfMarginMm} mm).
                  </p>
                </div>
                <div className="mt-1 flex justify-between text-[6.5px] text-slate-400 font-mono">
                  <span>{selectedBook?.layoutConfig?.pageFormat || 'A5'}</span>
                  <span>1 / 12</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(['pdf', 'epub', 'html', 'docx'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={!selectedBookId || busyFormat !== null}
                onClick={() => triggerExport(fmt)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold disabled:opacity-40 cursor-pointer ${
                  fmt === 'pdf'
                    ? 'bg-[#6D28D9] text-white hover:bg-violet-700'
                    : 'bg-[#0F172A] dark:bg-slate-800 text-white hover:opacity-90'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {busyFormat === fmt
                    ? 'Génération…'
                    : fmt === 'pdf'
                      ? `Générer ${pdfStandard === 'standard' ? 'PDF' : pdfStandard} (${pdfFontFamily.toUpperCase()} · ${pdfMarginMm} mm)`
                      : fmt.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <h2 className="font-display text-base font-bold">Historique des exports</h2>
          </div>
          {exportsList.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Aucun export généré pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Livre</th>
                    <th className="px-6 py-3">Fichier</th>
                    <th className="px-6 py-3">Format</th>
                    <th className="px-6 py-3 text-right">Taille</th>
                    <th className="px-6 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exportsList.map((ex) => (
                    <tr key={ex.id}>
                      <td className="px-6 py-3 font-medium">{ex.bookTitle}</td>
                      <td className="px-6 py-3 font-mono">{ex.fileName}</td>
                      <td className="px-6 py-3 uppercase font-semibold">{ex.format}</td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums">
                        {Math.max(1, Math.round(ex.fileSizeBytes / 1024))} Ko
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                        {new Date(ex.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export const SettingsPage: React.FC = () => {
  const { bootstrap, apiFetch, refreshBootstrap, notify, locale, setLocale, theme, toggleTheme, firebaseUser } =
    useApp();
  const [fullName, setFullName] = useState(bootstrap?.user?.profile.fullName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/my/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, preferredLocale: locale }),
      });
      if (res.ok) {
        await refreshBootstrap();
        notify('success', 'Paramètres enregistrés.');
      } else {
        notify('error', 'Erreur lors de la sauvegarde.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerify = async () => {
    try {
      await resendVerificationEmail();
      notify('success', 'E-mail de vérification envoyé.');
    } catch {
      notify('error', 'Impossible d’envoyer l’e-mail pour le moment.');
    }
  };

  return (
    <DashboardShell title="Paramètres du compte" breadcrumb="EBOOK STUDIO AI / Settings">
      <div className="max-w-2xl space-y-6">
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold">Profil & Langue d’interface</h2>

          <div>
            <label className="block text-xs font-medium mb-1">Nom d’auteur affiché</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Langue de l’interface (11 langues, arabe RTL)</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} {l.isRtl ? '(RTL)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium">Apparence visuelle</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <MailCheck className="h-4 w-4 text-[#6D28D9]" />
            <span>Vérification d’adresse e-mail</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Statut :{' '}
            <strong>{firebaseUser?.emailVerified ? 'Adresse vérifiée' : 'En attente de vérification'}</strong>{' '}
            ({firebaseUser?.email})
          </p>
          {!firebaseUser?.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerify}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              Renvoyer l’e-mail de vérification
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export const BillingPage: React.FC = () => {
  const { apiFetch, bootstrap, notify, refreshBootstrap } = useApp();
  const [billing, setBilling] = useState<{
    balance: number;
    creditTransactions: Array<{
      id: string;
      amount: number;
      type: string;
      action: string;
      description: string;
      createdAt: string;
    }>;
    paymentGatewayConfigured: boolean;
  } | null>(null);

  const loadBilling = async () => {
    const res = await apiFetch('/api/my/billing');
    if (res.ok) {
      setBilling(await res.json());
    }
  };

  useEffect(() => {
    void loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPlan = async (planId: 'free' | 'pro' | 'business') => {
    const res = await apiFetch('/api/my/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('success', `Formule ${planId} activée.`);
      await refreshBootstrap();
      void loadBilling();
    } else {
      notify('info', data.error || 'Passerelle de paiement non configurée.');
    }
  };

  const currentPlan = bootstrap?.user?.profile.plan || 'free';

  return (
    <DashboardShell title="Abonnement & Crédits IA" breadcrumb="EBOOK STUDIO AI / Billing">
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Solde actuel de crédits IA</div>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#6D28D9] dark:text-violet-400">
              {(billing?.balance ?? bootstrap?.user?.creditBalance ?? 0).toLocaleString()} crédits
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 max-w-md">
            <div className="flex items-center gap-1.5 font-semibold">
              <CreditCard className="h-4 w-4" />
              <span>
                Passerelle de paiement :{' '}
                {billing?.paymentGatewayConfigured ? 'Stripe actif' : 'Non configurée (mode explicatif)'}
              </span>
            </div>
            {!billing?.paymentGatewayConfigured && (
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Aucune transaction factice n’est simulée. Configurez <code className="font-mono">STRIPE_SECRET_KEY</code> pour activer le paiement en ligne, ou attribuez un plan depuis le Panneau Administrateur.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(bootstrap?.plans || []).map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#6D28D9] bg-violet-50/30 dark:bg-violet-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {plan.priceMonthlyEur} € <span className="text-xs font-normal">/ mois</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[#6D28D9]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan.id)}
                  className="mt-6 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isCurrent ? 'Formule actuelle' : `Passer à ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Credit Transactions Ledger */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <h2 className="font-display text-base font-bold">Historique des crédits & consommations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3 text-right">Montant</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(billing?.creditTransactions || []).map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-3">{tx.description}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{tx.action}</td>
                    <td
                      className={`px-6 py-3 text-right font-mono font-semibold tabular-nums ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};
