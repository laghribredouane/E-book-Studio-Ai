import React, { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { SUPPORTED_LOCALES } from '../i18n/translations';

export const PublicHeader: React.FC = () => {
  const { navigate, route, t, bootstrap, theme, toggleTheme, locale, setLocale } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = Boolean(bootstrap?.user);

  const handleNav = (target: () => void) => {
    setMobileOpen(false);
    target();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-[#F8F8FA]/95 dark:bg-[#0B0F1A]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text wordmark */}
        <button
          type="button"
          onClick={() => navigate({ name: 'landing' })}
          className="text-left font-display text-lg font-bold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          EBOOK STUDIO AI
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => navigate({ name: 'library' })}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#0F172A] dark:hover:text-white cursor-pointer ${
              route.name === 'library' ? 'text-[#6D28D9] dark:text-violet-400 underline underline-offset-4' : ''
            }`}
          >
            {t.navLibrary}
          </button>
          <a
            href="#features"
            onClick={(e) => {
              if (route.name !== 'landing') {
                e.preventDefault();
                navigate({ name: 'landing' });
              }
            }}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#0F172A] dark:hover:text-white"
          >
            {t.navFeatures}
          </a>
          <a
            href="#pricing"
            onClick={(e) => {
              if (route.name !== 'landing') {
                e.preventDefault();
                navigate({ name: 'landing' });
              }
            }}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#0F172A] dark:hover:text-white"
          >
            {t.navPricing}
          </a>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? { name: 'studio' } : { name: 'auth', mode: 'login' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
          >
            {isAuthenticated ? t.navStudio : t.navLogin}
          </button>
        </nav>

        {/* Zone 3: 1 primary action + mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? { name: 'dashboard' } : { name: 'auth', mode: 'register' })}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-violet-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isAuthenticated ? t.navDashboard : t.navStartFree}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          <button
            type="button"
            onClick={() => handleNav(() => navigate({ name: 'library' }))}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {t.navLibrary}
          </button>
          <button
            type="button"
            onClick={() => handleNav(() => navigate({ name: 'auth', mode: 'login' }))}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {isAuthenticated ? t.navDashboard : t.navLogin}
          </button>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label="Langue"
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-1.5 text-xs"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-white dark:bg-slate-900">
                  {loc.nativeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === 'dark' ? 'Clair' : 'Sombre'}
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              handleNav(() =>
                navigate(isAuthenticated ? { name: 'dashboard' } : { name: 'auth', mode: 'register' })
              )
            }
            className="w-full rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white"
          >
            {isAuthenticated ? t.navDashboard : t.navStartFree}
          </button>
        </div>
      )}
    </header>
  );
};
