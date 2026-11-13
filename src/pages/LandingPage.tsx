import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Globe,
  Layers,
  Moon,
  PenTool,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PublicHeader } from '../components/PublicHeader';
import { BookCoverPreview } from '../components/BookCoverPreview';
import { SUPPORTED_LOCALES } from '../i18n/translations';
import type { Book } from '../types';

export const LandingPage: React.FC = () => {
  const { navigate, bootstrap, t, theme, toggleTheme, locale, setLocale } = useApp();
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const isAuthenticated = Boolean(bootstrap?.user);

  useEffect(() => {
    fetch('/api/books?sort=popular')
      .then((r) => (r.ok ? r.json() : { books: [] }))
      .then((data) => setFeaturedBooks((data.books || []).slice(0, 4)))
      .catch(() => setFeaturedBooks([]));
  }, []);

  const workflowSteps = [
    {
      num: '01',
      title: 'Cadrage & Plan Gemini',
      desc: 'Définissez votre sujet, public cible et langue de rédaction. L’IA génère une table des matières structurée en chapitres et sous-sections modifiables.',
    },
    {
      num: '02',
      title: 'Éditeur & Outils Rédactionnels',
      desc: 'Rédigez directement ou utilisez les 10 outils IA (continuer, réécrire, développer, corriger, traduire, changer de ton) avec sauvegarde automatique.',
    },
    {
      num: '03',
      title: 'Illustrations & Couverture',
      desc: 'Créez des illustrations sur mesure, composez votre couverture avec typographies et couleurs, et configurez format A4, A5 ou Letter.',
    },
    {
      num: '04',
      title: 'Relecture & Export PDF / EPUB 3',
      desc: 'Lancez un audit éditorial complet sans modification destructive, puis exportez de véritables fichiers PDF, EPUB 3, HTML et DOCX.',
    },
  ];

  const faqs = [
    {
      q: 'Les fichiers PDF et EPUB 3 exportés sont-ils réellement utilisables pour l’édition ?',
      a: 'Oui. Le serveur génère de véritables binaires PDF (avec page de couverture, table des matières, en-têtes, pieds de page et numérotation) et des archives EPUB 3 conformes incluant métadonnées OPF, navigation XHTML et support RTL pour l’arabe.',
    },
    {
      q: 'La langue du livre est-elle indépendante de la langue de l’interface ?',
      a: 'Totalement. Vous pouvez piloter l’interface en français, anglais ou arabe (RTL) tout en rédigeant votre manuscrit dans l’une des 11 langues prises en charge.',
    },
    {
      q: 'Comment fonctionne la relecture IA sur mes chapitres ?',
      a: 'L’assistant éditorial produit un rapport détaillé classé par chapitre (grammaire, répétitions, cohérence, passages incomplets, structure). Aucune modification n’est appliquée sans votre validation explicite.',
    },
    {
      q: 'Mes projets privés sont-ils protégés ?',
      a: 'Chaque requête privée exige un jeton d’authentification vérifié côté serveur, et l’accès aux manuscrits non publiés est strictement limité à leur auteur.',
    },
  ];

  const demoTestimonials = [
    {
      name: 'Camille Deschamps',
      role: 'Directrice éditoriale, Atelier Nord (Témoignage de démonstration)',
      quote:
        'Nous structurons nos guides techniques en 48 heures au lieu de trois semaines, tout en gardant le contrôle intégral sur chaque paragraphe et l’export EPUB 3.',
    },
    {
      name: 'Tariq Al-Mansoor',
      role: 'Formateur & Auteur indépendant (Témoignage de démonstration)',
      quote:
        'La prise en charge native du sens de lecture arabe RTL et l’assistant de relecture non intrusif m’ont permis de publier deux manuels bilingues sans logiciel tiers.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F8FA] dark:bg-[#0B0F1A] text-[#0F172A] dark:text-slate-100">
      <PublicHeader />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Bibliothèque numérique</span>
                <span aria-hidden="true">·</span>
                <span>Studio IA Gemini</span>
                <span aria-hidden="true">·</span>
                <span>Export PDF & EPUB 3</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
              >
                {t.heroTitle}
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {t.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isAuthenticated ? { name: 'studio' } : { name: 'auth', mode: 'register' })
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-violet-600 cursor-pointer whitespace-nowrap"
                >
                  <span>{isAuthenticated ? 'Ouvrir le studio' : t.heroCtaPrimary}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ name: 'library' })}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-[#0F172A] dark:text-white transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 text-[#6D28D9] dark:text-violet-400" />
                  <span>{t.heroCtaSecondary}</span>
                </button>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-[#0F172A] dark:text-white">
                  11
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Langues & mode arabe RTL
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-[#0F172A] dark:text-white">
                  4 formats
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  PDF, EPUB 3, HTML, DOCX
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-[#0F172A] dark:text-white">
                  10 outils
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Édition & relecture Gemini
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[340px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <img
                src="/src/assets/images/hero_editorial_studio_1794562687252.jpg"
                alt="Atelier éditorial numérique EBOOK STUDIO AI"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Workflow & Features */}
      <section id="features" className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Une chaîne éditoriale complète, de l’idée brute au fichier distribuable
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Chaque étape du studio est connectée à votre manuscrit et enregistrée en temps réel.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8F8FA] dark:bg-slate-900/70 p-6"
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-[#6D28D9] dark:text-violet-400">
                    {step.num}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold text-[#0F172A] dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Capability Matrix */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <PenTool className="h-5 w-5 text-[#6D28D9] dark:text-violet-400" />
              <h3 className="mt-4 font-display text-base font-semibold">Rédacteur riche & IA non intrusive</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Titres H1–H3, citations, tableaux, listes, insertion d’images et assistant de révision qui propose sans jamais écraser votre texte.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="mt-4 font-display text-base font-semibold">Couvertures & Mise en page</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Configurez formats A4, A5 ou Letter, marges, interligne, polices, en-têtes, pieds de page et table des matières automatique.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <Download className="h-5 w-5 text-[#0F172A] dark:text-slate-200" />
              <h3 className="mt-4 font-display text-base font-semibold">Bibliothèque & Lecteur intégré</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Consultez les ouvrages publics ou votre bibliothèque personnelle avec signets, reprise de lecture, mode sombre et taille de texte ajustable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Exemples d’ouvrages dans la bibliothèque
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Livres de démonstration multi-chapitres consultables immédiatement dans le lecteur intégré.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ name: 'library' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6D28D9] dark:text-violet-400 hover:underline cursor-pointer"
          >
            <span>Voir tout le catalogue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredBooks.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => navigate({ name: 'book-detail', bookId: book.id })}
              className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
            >
              <BookCoverPreview
                title={book.title}
                subtitle={book.subtitle}
                authorName={book.authorName}
                coverImageUrl={book.coverImageUrl}
                coverConfig={book.coverConfig}
              />
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                <h3 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] dark:text-white line-clamp-1 group-hover:text-[#6D28D9] dark:group-hover:text-violet-400">
                  {book.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">
                  {book.authorName}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Tarifs transparents par capacité éditoriale
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Chaque opération IA déduit un nombre de crédits configurable côté serveur.
              </p>
            </div>

            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F8F8FA] dark:bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Annuel (−20%)
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(bootstrap?.plans || []).map((plan) => {
              const price = billingCycle === 'annual' ? plan.priceAnnualEur : plan.priceMonthlyEur;
              const isPro = plan.id === 'pro';
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-2xl border p-7 ${
                    isPro
                      ? 'border-[#6D28D9] dark:border-violet-500 bg-[#F8F8FA] dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                      {isPro && (
                        <span className="text-xs font-semibold text-[#6D28D9] dark:text-violet-400">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{plan.audience}</p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-bold tabular-nums">{price} €</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ mois</span>
                    </div>

                    <ul className="mt-6 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                      {plan.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9] dark:text-violet-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        isAuthenticated ? { name: 'billing' } : { name: 'auth', mode: 'register' }
                      )
                    }
                    className={`mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                      isPro
                        ? 'bg-[#6D28D9] text-white hover:bg-violet-700'
                        : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {plan.id === 'free' ? 'Commencer gratuitement' : 'Choisir cette formule'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Testimonials & FAQ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Retours d’expérience</h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Données de démonstration illustrant les cas d’usage éditoriaux.
            </p>
          </div>
          {demoTestimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
            >
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                « {item.quote} »
              </p>
              <div className="mt-4 text-xs">
                <div className="font-semibold text-[#0F172A] dark:text-white">{item.name}</div>
                <div className="text-slate-500 dark:text-slate-400">{item.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7">
          <h2 className="font-display text-2xl font-bold tracking-tight">Questions fréquentes</h2>
          <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {faqs.map((item, idx) => (
              <div key={item.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 text-left font-medium text-sm sm:text-base text-[#0F172A] dark:text-white cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-display font-bold text-[#0F172A] dark:text-white">
              EBOOK STUDIO AI
            </span>
            <span>Plateforme d’édition numérique et bibliothèque IA</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ name: 'library' })}
              className="hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
            >
              {t.navLibrary}
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'auth', mode: 'login' })}
              className="hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
            >
              {t.navLogin}
            </button>

            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
              <Globe className="h-3.5 w-3.5" />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label="Langue interface"
                className="bg-transparent focus:outline-none"
              >
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900">
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
