import React, { useState } from 'react';
import {
  BookCopy,
  BookOpen,
  CreditCard,
  Download,
  FolderKanban,
  Globe,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Moon,
  PenTool,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { SUPPORTED_LOCALES } from '../i18n/translations';
import type { AppRoute } from '../types';

interface DashboardShellProps {
  title: string;
  breadcrumb?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  breadcrumb,
  action,
  children,
}) => {
  const { route, navigate, bootstrap, t, theme, toggleTheme, locale, setLocale, signOut } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profile = bootstrap?.user?.profile;
  const credits = bootstrap?.user?.creditBalance ?? 0;

  const navItems: Array<{ label: string; icon: React.ReactNode; target: AppRoute; match: string[] }> = [
    { label: t.sidebarDashboard, icon: <LayoutDashboard className="h-4 w-4" />, target: { name: 'dashboard' }, match: ['dashboard'] },
    { label: t.sidebarMyLibrary, icon: <BookOpen className="h-4 w-4" />, target: { name: 'my-library' }, match: ['my-library'] },
    { label: t.sidebarCreateEbook, icon: <Plus className="h-4 w-4" />, target: { name: 'studio', tab: 'setup' }, match: ['studio'] },
    { label: t.sidebarMyProjects, icon: <FolderKanban className="h-4 w-4" />, target: { name: 'projects' }, match: ['projects'] },
    { label: t.sidebarAiWriter, icon: <PenTool className="h-4 w-4" />, target: { name: 'studio', tab: 'editor' }, match: [] },
    { label: t.sidebarIllustrations, icon: <ImageIcon className="h-4 w-4" />, target: { name: 'illustrations' }, match: ['illustrations'] },
    { label: t.sidebarTemplates, icon: <LayoutTemplate className="h-4 w-4" />, target: { name: 'templates' }, match: ['templates'] },
    { label: t.sidebarFavorites, icon: <Heart className="h-4 w-4" />, target: { name: 'favorites' }, match: ['favorites'] },
    { label: t.sidebarExports, icon: <Download className="h-4 w-4" />, target: { name: 'exports' }, match: ['exports'] },
    { label: t.sidebarSettings, icon: <Settings className="h-4 w-4" />, target: { name: 'settings' }, match: ['settings'] },
    { label: t.sidebarBilling, icon: <CreditCard className="h-4 w-4" />, target: { name: 'billing' }, match: ['billing'] },
  ];

  const handleGo = (target: AppRoute) => {
    setSidebarOpen(false);
    navigate(target);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#0F172A] border-e border-slate-200 dark:border-slate-800 px-4 py-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => handleGo({ name: 'landing' })}
            className="font-display text-base font-bold tracking-tight text-[#0F172A] dark:text-white cursor-pointer"
          >
            EBOOK STUDIO AI
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-md p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Credits Summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8F8FA] dark:bg-slate-900/80 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.creditsAvailable}</span>
            <span className="font-medium capitalize text-[#6D28D9] dark:text-violet-400">
              {profile?.plan || 'free'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-semibold tabular-nums text-[#0F172A] dark:text-white">
              {credits.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => handleGo({ name: 'billing' })}
              className="text-xs font-medium text-[#6D28D9] dark:text-violet-400 hover:underline cursor-pointer"
            >
              Gérer
            </button>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.match.includes(route.name);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleGo(item.target)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9] dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => handleGo({ name: 'library' })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer"
          >
            <BookCopy className="h-4 w-4" />
            <span className="truncate">{t.navLibrary}</span>
          </button>

          {profile?.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleGo({ name: 'admin' })}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                route.name === 'admin'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="truncate">{t.sidebarAdmin}</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile & Controls */}
      <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label="Langue"
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-white dark:bg-slate-900">
                  {loc.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Changer de thème"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-[#0F172A] dark:text-white">
              {profile?.fullName || 'Auteur'}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {profile?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title={t.logout}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8F8FA] dark:bg-[#0B0F1A] text-[#0F172A] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir la navigation"
              className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {breadcrumb && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{breadcrumb}</div>
              )}
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">{action}</div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
