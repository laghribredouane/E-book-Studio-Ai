import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Flag, Heart, PenTool, Star } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PublicHeader } from '../components/PublicHeader';
import { BookCoverPreview } from '../components/BookCoverPreview';
import type { Book, BookChapter } from '../types';

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
}

export const BookDetailPage: React.FC<{ bookId: string }> = ({ bookId }) => {
  const { navigate, apiFetch, bootstrap, notify, t } = useApp();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Contenu inapproprié');
  const [reportDetails, setReportDetails] = useState('');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/books/${bookId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Livre introuvable.');
      } else {
        setBook(data.book);
        setChapters(data.chapters || []);
        setReviews(data.reviews || []);
        setIsFavorited(Boolean(data.isFavorited));
        setCanEdit(Boolean(data.canEdit));
      }
    } catch {
      setError('Erreur réseau lors du chargement du livre.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, bookId]);

  useEffect(() => {
    void loadDetail();
    void fetch(`/api/books/${bookId}/view`, { method: 'POST' }).catch(() => {});
  }, [bookId, loadDetail]);

  const handleToggleFavorite = async () => {
    if (!bootstrap?.user) {
      notify('info', 'Connectez-vous pour enregistrer ce livre dans vos favoris.');
      navigate({ name: 'auth', mode: 'login' });
      return;
    }
    const res = await apiFetch(`/api/books/${bookId}/favorite`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setIsFavorited(data.favorited);
      notify('success', data.favorited ? 'Ajouté aux favoris.' : 'Retiré des favoris.');
      void loadDetail();
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrap?.user) {
      navigate({ name: 'auth', mode: 'login' });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiFetch(`/api/books/${bookId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewComment('');
        notify('success', 'Votre avis a été publié.');
        void loadDetail();
      } else {
        notify('error', data.error || 'Impossible de publier l’avis.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrap?.user) {
      navigate({ name: 'auth', mode: 'login' });
      return;
    }
    const res = await apiFetch(`/api/books/${bookId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason: reportReason, details: reportDetails }),
    });
    if (res.ok) {
      setShowReportModal(false);
      setReportDetails('');
      notify('success', 'Signalement transmis à l’équipe de modération.');
    } else {
      notify('error', 'Impossible d’envoyer le signalement.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FA] dark:bg-[#0B0F1A] text-[#0F172A] dark:text-slate-100">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate({ name: 'library' })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour à la bibliothèque</span>
        </button>

        {loading ? (
          <div className="mt-8 h-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        ) : error || !book ? (
          <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
            <h1 className="font-display text-xl font-bold">{error || 'Livre introuvable'}</h1>
          </div>
        ) : (
          <div className="mt-8 space-y-12">
            {/* Hero Book Info */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
              <div className="md:col-span-4 max-w-[280px] w-full mx-auto">
                <BookCoverPreview
                  title={book.title}
                  subtitle={book.subtitle}
                  authorName={book.authorName}
                  coverImageUrl={book.coverImageUrl}
                  coverConfig={book.coverConfig}
                />
              </div>

              <div className="md:col-span-8 space-y-5" dir={book.languageCode === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="capitalize">{book.categorySlug}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">{book.languageCode}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{chapters.length} chapitres</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{book.wordCount.toLocaleString()} mots</span>
                  {book.isDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Ouvrage de démonstration</span>
                    </>
                  )}
                </div>

                <div>
                  <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
                    {book.title}
                  </h1>
                  {book.subtitle && (
                    <p className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                      {book.subtitle}
                    </p>
                  )}
                  <p className="mt-2 text-sm font-medium text-[#6D28D9] dark:text-violet-400">
                    Par {book.authorName}
                  </p>
                </div>

                <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
                  {book.description || book.subject}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2" dir="ltr">
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'reader', bookId: book.id, chapter: 1 })}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-violet-600 cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>{t.readBook}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                      isFavorited
                        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                    <span>{isFavorited ? t.removeFavorite : t.addFavorite}</span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'studio', bookId: book.id, tab: 'editor' })}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <PenTool className="h-4 w-4" />
                      <span>Ouvrir dans le Studio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Signaler</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table of Contents & Chapter Previews */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Table des matières & aperçu</h2>
              {chapters.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucun chapitre publié pour le moment.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {chapters.map((ch) => {
                    const excerpt = ch.contentHtml
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .slice(0, 220);
                    return (
                      <div key={ch.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="text-xs font-semibold text-[#6D28D9] dark:text-violet-400">
                            Chapitre {ch.chapterNumber} · {ch.wordCount.toLocaleString()} mots
                          </div>
                          <h3 className="font-display text-lg font-semibold">{ch.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {excerpt || ch.summary || 'Chapitre prêt pour la lecture.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ name: 'reader', bookId: book.id, chapter: ch.chapterNumber })
                          }
                          className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Lire ce chapitre
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-4">
                <h2 className="font-display text-xl font-bold">Avis des lecteurs ({reviews.length})</h2>
                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Soyez le premier lecteur à laisser un avis constructif sur cet ouvrage.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{rev.reviewerName}</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400">
                            {rev.rating} / 5
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmitReview}
                className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 h-fit"
              >
                <h3 className="font-display text-base font-semibold">Donner votre avis</h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 cursor-pointer"
                      aria-label={`Note ${star}`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= reviewRating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  required
                  placeholder="Partagez votre retour sur la clarté et la qualité du manuscrit…"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? 'Envoi…' : 'Publier l’avis'}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleSendReport}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold">Signaler cet ouvrage</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Motif</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              >
                <option value="Contenu inapproprié">Contenu inapproprié</option>
                <option value="Plagiat ou droits d’auteur">Plagiat ou droits d’auteur</option>
                <option value="Spam ou contenu trompeur">Spam ou contenu trompeur</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Détails complémentaires</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Envoyer le signalement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
