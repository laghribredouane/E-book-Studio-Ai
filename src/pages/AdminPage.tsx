import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardShell } from '../components/DashboardShell';
import type { Book, BookCategory, BookLanguage } from '../types';

type AdminTab = 'overview' | 'users' | 'books' | 'taxonomy' | 'reports' | 'settings';

export const AdminPage: React.FC = () => {
  const { apiFetch, bootstrap, notify, refreshBootstrap } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      plan: string;
      isActive: boolean;
      creditBalance: number;
    }>
  >([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [languages, setLanguages] = useState<BookLanguage[]>([]);
  const [reports, setReports] = useState<
    Array<{
      report: { id: string; reason: string; details: string; status: string; createdAt: string };
      bookTitle: string;
      reporterEmail: string;
    }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string }>
  >([]);

  const [aiModels, setAiModels] = useState({
    textModel: 'gemini-4-hydrogen',
    imageModel: 'gemini-3.1-flash-lite-image',
  });
  const [aiCosts, setAiCosts] = useState<Record<string, number>>({});

  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const isAdmin = bootstrap?.user?.profile.role === 'admin';

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    const [ovRes, uRes, bRes, rRes] = await Promise.all([
      apiFetch('/api/admin/overview'),
      apiFetch('/api/admin/users'),
      apiFetch('/api/admin/books'),
      apiFetch('/api/admin/reports'),
    ]);

    if (ovRes.ok) {
      const ov = await ovRes.json();
      setStats(ov.stats || {});
      setAuditLogs(ov.auditLogs || []);
      setCategories(ov.categories || []);
      setLanguages(ov.languages || []);
      if (ov.aiModels) setAiModels(ov.aiModels);
      if (ov.aiCosts) setAiCosts(ov.aiCosts);
    }
    if (uRes.ok) setUsers((await uRes.json()).users || []);
    if (bRes.ok) setBooks((await bRes.json()).books || []);
    if (rRes.ok) setReports((await rRes.json()).reports || []);
  }, [apiFetch, isAdmin]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  if (!isAdmin) {
    return (
      <DashboardShell title="Accès restreint" breadcrumb="EBOOK STUDIO AI / Administration">
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
          <h2 className="font-display text-lg font-bold">Espace réservé aux administrateurs</h2>
          <p className="text-sm text-slate-500">
            Votre compte ne dispose pas des privilèges d’administration côté serveur.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const updateUser = async (profileId: string, payload: Record<string, unknown>) => {
    const res = await apiFetch(`/api/admin/users/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      notify('success', 'Utilisateur mis à jour.');
      void loadAdminData();
      await refreshBootstrap();
    } else {
      notify('error', 'Échec de mise à jour.');
    }
  };

  const moderateBook = async (bookId: string, payload: Record<string, unknown>) => {
    const res = await apiFetch(`/api/admin/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      notify('success', 'Statut du livre mis à jour.');
      void loadAdminData();
    }
  };

  const deleteBook = async (bookId: string) => {
    const res = await apiFetch(`/api/admin/books/${bookId}`, { method: 'DELETE' });
    if (res.ok) {
      notify('info', 'Livre supprimé.');
      void loadAdminData();
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ aiModels, aiCosts }),
    });
    if (res.ok) {
      notify('success', 'Modèles et coûts IA enregistrés.');
      await refreshBootstrap();
    }
  };

  return (
    <DashboardShell title="Panneau Administrateur" breadcrumb="EBOOK STUDIO AI / Admin">
      {/* Admin Sub-Navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Vue globale & Audit' },
          { id: 'users', label: 'Utilisateurs & Crédits' },
          { id: 'books', label: 'Livres & Modération' },
          { id: 'taxonomy', label: 'Catégories & Langues' },
          { id: 'reports', label: `Signalements (${stats.openReports ?? 0})` },
          { id: 'settings', label: 'Modèles & Coûts IA' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as AdminTab)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              tab === item.id
                ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Utilisateurs', val: stats.users ?? 0 },
                { label: 'Total livres', val: stats.books ?? 0 },
                { label: 'Livres publics', val: stats.publicBooks ?? 0 },
                { label: 'Exports générés', val: stats.exports ?? 0 },
                { label: 'Appels IA', val: stats.aiGenerations ?? 0 },
                { label: 'Signalements', val: stats.openReports ?? 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                >
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{s.val}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <h2 className="font-display text-base font-bold">Journal d’audit serveur</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Cible</th>
                      <th className="px-6 py-3 text-right">Horodatage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-3 font-mono font-semibold">{log.action}</td>
                        <td className="px-6 py-3 text-slate-500">
                          {log.targetType} ({log.targetId.slice(0, 8)}…)
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="px-5 py-3">Utilisateur</th>
                  <th className="px-5 py-3">Rôle</th>
                  <th className="px-5 py-3">Formule</th>
                  <th className="px-5 py-3 text-right">Crédits</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{u.fullName}</div>
                      <div className="text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                        className="rounded border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.plan}
                        onChange={(e) => updateUser(u.id, { plan: e.target.value })}
                        className="rounded border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="business">business</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {u.creditBalance.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => updateUser(u.id, { grantCredits: 250 })}
                        className="rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        +250 cr.
                      </button>
                      <button
                        type="button"
                        onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                        className={`rounded px-2.5 py-1 cursor-pointer ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                      >
                        {u.isActive ? 'Actif' : 'Suspendu'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'books' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="px-5 py-3">Titre</th>
                  <th className="px-5 py-3">Auteur</th>
                  <th className="px-5 py-3">Langue</th>
                  <th className="px-5 py-3 text-right">Mots</th>
                  <th className="px-5 py-3 text-right">Visibilité & Modération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {books.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 font-semibold">{b.title}</td>
                    <td className="px-5 py-3 text-slate-500">{b.authorName}</td>
                    <td className="px-5 py-3 uppercase">{b.languageCode}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {b.wordCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => moderateBook(b.id, { isPublic: !b.isPublic })}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1 cursor-pointer"
                      >
                        {b.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        <span>{b.isPublic ? 'Public' : 'Masqué'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBook(b.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'taxonomy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold">Catégories</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="slug (ex. history)"
                  className="w-1/3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nom affiché"
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiFetch('/api/admin/categories', {
                      method: 'POST',
                      body: JSON.stringify({ slug: newCatSlug, name: newCatName }),
                    });
                    if (res.ok) {
                      setNewCatSlug('');
                      setNewCatName('');
                      void loadAdminData();
                      await refreshBootstrap();
                    }
                  }}
                  className="rounded-lg bg-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-semibold">{c.name}</span>{' '}
                      <span className="font-mono text-slate-400">({c.slug})</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                        void loadAdminData();
                      }}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold">Langues supportées (11)</h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {languages.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-semibold">{l.nativeName}</span>{' '}
                      <span className="text-slate-500">
                        ({l.code}) {l.isRtl ? '· RTL' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/languages/${l.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ isActive: !l.isActive }),
                        });
                        void loadAdminData();
                        await refreshBootstrap();
                      }}
                      className={`rounded px-2.5 py-1 cursor-pointer ${
                        l.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {l.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-base font-bold">Signalements de modération</h2>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun signalement en attente.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.map((item) => (
                  <div key={item.report.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold">
                        {item.bookTitle} · {item.report.reason}
                      </div>
                      <div className="text-xs text-slate-500">
                        Par {item.reporterEmail} — {item.report.details}
                      </div>
                    </div>
                    <select
                      value={item.report.status}
                      onChange={async (e) => {
                        await apiFetch(`/api/admin/reports/${item.report.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        void loadAdminData();
                      }}
                      className="rounded border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-1 text-xs"
                    >
                      <option value="open">Ouvert</option>
                      <option value="reviewed">Examiné</option>
                      <option value="resolved">Résolu</option>
                      <option value="dismissed">Classé</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <form
            onSubmit={handleSaveAiSettings}
            className="max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-bold">Configuration des modèles & coûts IA</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Modèle Gemini Texte</label>
                <select
                  value={aiModels.textModel}
                  onChange={(e) => setAiModels({ ...aiModels, textModel: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="gemini-4-hydrogen">gemini-4-hydrogen (Rapide & Standard)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Raisonnement avancé)</option>
                  <option value="gemini-4-carbon">gemini-4-carbon (Profondeur maximale)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Modèle Gemini Illustrations</label>
                <select
                  value={aiModels.imageModel}
                  onChange={(e) => setAiModels({ ...aiModels, imageModel: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image</option>
                  <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {Object.entries(aiCosts).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-[11px] font-mono text-slate-500 mb-1">{key}</label>
                  <input
                    type="number"
                    min={0}
                    value={val}
                    onChange={(e) => setAiCosts({ ...aiCosts, [key]: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Enregistrer la configuration</span>
            </button>
          </form>
        )}
      </div>
    </DashboardShell>
  );
};
