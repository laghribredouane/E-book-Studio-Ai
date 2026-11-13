import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AppProvider, useApp } from './contexts/AppContext';
import { LandingPage } from './pages/LandingPage';
import { PublicLibraryPage } from './pages/PublicLibraryPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ReaderPage } from './pages/ReaderPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { MyLibraryPage } from './pages/MyLibraryPage';
import { StudioPage } from './pages/StudioPage';
import {
  BillingPage,
  ExportCenterPage,
  IllustrationsGalleryPage,
  SettingsPage,
  TemplatesPage,
} from './pages/SecondaryPages';
import { AdminPage } from './pages/AdminPage';
import type { AppRoute, StudioTab } from './types';

interface BookSeoSummary {
  title: string;
  subtitle?: string;
  authorName?: string;
  description?: string;
  subject?: string;
  languageCode?: string;
}

const STUDIO_TAB_LABELS: Record<StudioTab, string> = {
  setup: 'Configuration du projet',
  outline: 'Plan IA & Chapitres',
  editor: 'Rédaction assistée',
  illustrations: 'Illustrations IA',
  cover: 'Concepteur de couverture',
  layout: 'Mise en page',
  proofread: 'Relecture éditoriale',
  export: 'Export & Publication',
};

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(data: Record<string, unknown>) {
  const scriptId = 'ebook-studio-jsonld';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function getBaseRouteSeo(route: AppRoute): {
  title: string;
  description: string;
  ogType: 'website' | 'book';
} {
  switch (route.name) {
    case 'landing':
      return {
        title: "EBOOK STUDIO AI — Bibliothèque Numérique & Studio d'eBooks IA",
        description:
          "Découvrez notre bibliothèque numérique et créez vos eBooks avec l'IA : génération de plans, rédaction, illustrations, couvertures et export PDF/EPUB 3.",
        ogType: 'website',
      };
    case 'library':
      return {
        title: "Bibliothèque Publique — Catalogue d'eBooks | EBOOK STUDIO AI",
        description:
          "Explorez le catalogue d'eBooks multilingues par catégorie, langue et auteur, et lisez directement en ligne dans notre lecteur intégré.",
        ogType: 'website',
      };
    case 'book-detail':
      return {
        title: "Fiche de l'eBook — Bibliothèque | EBOOK STUDIO AI",
        description:
          "Consultez la table des matières, le résumé, les aperçus de chapitres et les avis des lecteurs sur EBOOK STUDIO AI.",
        ogType: 'book',
      };
    case 'reader':
      return {
        title: "Lecteur d'eBook en ligne — EBOOK STUDIO AI",
        description:
          "Lisez vos livres numériques en ligne avec modes papier, sépia et nuit, navigation par chapitres, signets et support RTL.",
        ogType: 'book',
      };
    case 'auth':
      return {
        title:
          route.mode === 'register'
            ? 'Créer un compte auteur — EBOOK STUDIO AI'
            : route.mode === 'reset'
              ? 'Réinitialiser le mot de passe — EBOOK STUDIO AI'
              : 'Connexion — EBOOK STUDIO AI',
        description:
          "Accédez à votre espace auteur EBOOK STUDIO AI pour gérer vos manuscrits, générer des chapitres avec Gemini et exporter vos eBooks.",
        ogType: 'website',
      };
    case 'dashboard':
      return {
        title: 'Tableau de bord Auteur — EBOOK STUDIO AI',
        description:
          'Suivez vos livres créés, projets en cours, crédits IA disponibles et activité récente depuis votre espace de travail éditorial.',
        ogType: 'website',
      };
    case 'my-library':
    case 'projects':
      return {
        title: 'Ma Bibliothèque & Projets — EBOOK STUDIO AI',
        description:
          'Organisez vos manuscrits, importez des documents texte, dupliquez vos projets et reprenez la lecture de vos ouvrages.',
        ogType: 'website',
      };
    case 'favorites':
      return {
        title: 'Mes Favoris — Bibliothèque Personnelle | EBOOK STUDIO AI',
        description:
          'Retrouvez tous les livres numériques que vous avez ajoutés à vos favoris pour un accès rapide depuis votre espace personnel.',
        ogType: 'website',
      };
    case 'studio': {
      if (route.mode === 'image') {
        return {
          title: 'Générateur d’eBook inspiré par image — Studio | EBOOK STUDIO AI',
          description:
            'Importez une photo ou illustration et laissez Gemini Vision créer votre eBook complet : titre, synopsis, palette de couverture, plan structuré et chapitre 1.',
          ogType: 'website',
        };
      }
      const stepLabel = route.tab ? ` · ${STUDIO_TAB_LABELS[route.tab]}` : '';
      return {
        title: `Studio de Création${stepLabel} — EBOOK STUDIO AI`,
        description:
          "Rédigez, illustrez, concevez votre couverture, mettez en page, relisez avec l'IA et exportez votre eBook en PDF, EPUB 3, HTML ou DOCX.",
        ogType: 'website',
      };
    }
    case 'illustrations':
      return {
        title: "Galerie d'Illustrations IA — EBOOK STUDIO AI",
        description:
          "Parcourez vos illustrations générées par IA ainsi que la collection de planches éditoriales et couvertures prêtes pour vos eBooks.",
        ogType: 'website',
      };
    case 'templates':
      return {
        title: 'Modèles Éditoriaux & Couvertures — EBOOK STUDIO AI',
        description:
          'Initialisez un nouveau livre à partir de modèles éditoriaux soignés incluant typographie, marges et design de couverture.',
        ogType: 'website',
      };
    case 'exports':
      return {
        title: "Centre d'Exportation PDF & EPUB 3 — EBOOK STUDIO AI",
        description:
          'Générez et téléchargez vos livres numériques aux formats PDF haute qualité, EPUB 3, HTML5 autonome et Microsoft Word (.docx).',
        ogType: 'website',
      };
    case 'settings':
      return {
        title: 'Paramètres du Compte & Langue — EBOOK STUDIO AI',
        description:
          "Configurez votre nom d'auteur, votre langue d'interface parmi 11 langues (avec support arabe RTL) et le thème clair ou sombre.",
        ogType: 'website',
      };
    case 'billing':
      return {
        title: 'Abonnement & Crédits IA — EBOOK STUDIO AI',
        description:
          "Consultez votre solde de crédits IA, l'historique détaillé de consommation et les formules d'abonnement EBOOK STUDIO AI.",
        ogType: 'website',
      };
    case 'admin':
      return {
        title: "Console d'Administration — EBOOK STUDIO AI",
        description:
          'Administrez les utilisateurs, les crédits IA, la modération du catalogue, les modèles Gemini et les journaux d’audit.',
        ogType: 'website',
      };
  }
}

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-md ${
            t.kind === 'error'
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
              : t.kind === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
          }`}
        >
          <span>{t.text}</span>
          <button type="button" onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const RouterView: React.FC = () => {
  const { route, authReady, bootstrap, loadingBootstrap, apiFetch } = useApp();
  const bookSeoCacheRef = useRef<Map<string, BookSeoSummary>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const baseSeo = getBaseRouteSeo(route);
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    const applySeo = (
      title: string,
      description: string,
      ogType: 'website' | 'book',
      bookMeta?: BookSeoSummary
    ) => {
      const clippedDesc =
        description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;

      document.title = title;
      upsertMetaTag('name', 'description', clippedDesc);
      upsertMetaTag('property', 'og:title', title);
      upsertMetaTag('property', 'og:description', clippedDesc);
      upsertMetaTag('property', 'og:type', ogType);
      upsertMetaTag('property', 'og:site_name', 'EBOOK STUDIO AI');
      upsertMetaTag('property', 'og:url', canonicalUrl);
      upsertMetaTag('name', 'twitter:title', title);
      upsertMetaTag('name', 'twitter:description', clippedDesc);
      upsertCanonicalLink(canonicalUrl);

      if (ogType === 'book' && bookMeta) {
        upsertJsonLd({
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: bookMeta.title,
          author: bookMeta.authorName
            ? { '@type': 'Person', name: bookMeta.authorName }
            : undefined,
          inLanguage: bookMeta.languageCode || 'fr',
          description: clippedDesc,
          publisher: { '@type': 'Organization', name: 'EBOOK STUDIO AI' },
        });
      } else {
        upsertJsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'EBOOK STUDIO AI',
          applicationCategory: 'ProductivityApplication',
          operatingSystem: 'All',
          description: clippedDesc,
          url: canonicalUrl,
        });
      }
    };

    // Apply immediate route-level metadata
    applySeo(baseSeo.title, baseSeo.description, baseSeo.ogType);

    // Enrich dynamically when viewing a specific book (detail, reader, or studio)
    const targetBookId =
      route.name === 'book-detail' || route.name === 'reader' || route.name === 'studio'
        ? route.bookId
        : undefined;

    if (!targetBookId) {
      return () => {
        cancelled = true;
      };
    }

    const applyBookSeo = (book: BookSeoSummary) => {
      if (cancelled) return;
      const authorSuffix = book.authorName ? ` — ${book.authorName}` : '';
      const rawDesc =
        book.description?.trim() ||
        book.subtitle?.trim() ||
        book.subject?.trim() ||
        baseSeo.description;

      if (route.name === 'book-detail') {
        applySeo(
          `${book.title}${authorSuffix} | EBOOK STUDIO AI`,
          rawDesc,
          'book',
          book
        );
      } else if (route.name === 'reader') {
        const chapterPrefix = route.chapter ? `Ch. ${route.chapter} · ` : '';
        applySeo(
          `${chapterPrefix}${book.title} — Lecteur | EBOOK STUDIO AI`,
          rawDesc,
          'book',
          book
        );
      } else if (route.name === 'studio') {
        const stepLabel = route.tab ? ` · ${STUDIO_TAB_LABELS[route.tab]}` : '';
        applySeo(
          `${book.title}${stepLabel} — Studio | EBOOK STUDIO AI`,
          rawDesc,
          'website'
        );
      }
    };

    const cached = bookSeoCacheRef.current.get(targetBookId);
    if (cached) {
      applyBookSeo(cached);
      return () => {
        cancelled = true;
      };
    }

    void apiFetch(`/api/books/${targetBookId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.book || cancelled) return;
        const summary: BookSeoSummary = {
          title: data.book.title,
          subtitle: data.book.subtitle,
          authorName: data.book.authorName,
          description: data.book.description,
          subject: data.book.subject,
          languageCode: data.book.languageCode,
        };
        bookSeoCacheRef.current.set(targetBookId, summary);
        applyBookSeo(summary);
      })
      .catch(() => {
        // Keep base route metadata if fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, route]);

  const isProtected = [
    'dashboard',
    'my-library',
    'projects',
    'studio',
    'illustrations',
    'templates',
    'favorites',
    'exports',
    'settings',
    'billing',
    'admin',
  ].includes(route.name);

  if (isProtected && (!authReady || (loadingBootstrap && !bootstrap))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8FA] dark:bg-[#0B0F1A]">
        <div className="text-sm font-medium text-slate-500">Chargement de votre studio…</div>
      </div>
    );
  }

  if (isProtected && !bootstrap?.user) {
    return <AuthPage initialMode="login" />;
  }

  switch (route.name) {
    case 'landing':
      return <LandingPage />;
    case 'library':
      return <PublicLibraryPage />;
    case 'book-detail':
      return <BookDetailPage bookId={route.bookId} />;
    case 'reader':
      return <ReaderPage bookId={route.bookId} initialChapter={route.chapter} />;
    case 'auth':
      return <AuthPage initialMode={route.mode} />;
    case 'dashboard':
      return <DashboardOverview />;
    case 'my-library':
    case 'projects':
      return <MyLibraryPage initialTab="all" />;
    case 'favorites':
      return <MyLibraryPage initialTab="favorites" />;
    case 'studio':
      return (
        <StudioPage
          initialBookId={route.bookId}
          initialTab={route.tab}
          initialMode={route.mode}
        />
      );
    case 'illustrations':
      return <IllustrationsGalleryPage />;
    case 'templates':
      return <TemplatesPage />;
    case 'exports':
      return <ExportCenterPage />;
    case 'settings':
      return <SettingsPage />;
    case 'billing':
      return <BillingPage />;
    case 'admin':
      return <AdminPage />;
    default:
      return <LandingPage />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <RouterView />
      <ToastContainer />
    </AppProvider>
  );
}
