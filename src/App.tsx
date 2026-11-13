import React from 'react';
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
  const { route, authReady, bootstrap, loadingBootstrap } = useApp();

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
      return <StudioPage initialBookId={route.bookId} initialTab={route.tab} />;
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
