import React, { useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  registerWithEmail,
  requestPasswordReset,
  signInWithEmail,
  signInWithGooglePopup,
} from '../lib/firebase';

export const AuthPage: React.FC<{ initialMode?: 'login' | 'register' | 'reset' }> = ({
  initialMode = 'login',
}) => {
  const { navigate, notify, refreshBootstrap } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGooglePopup();
      await refreshBootstrap();
      notify('success', 'Connexion Google réussie.');
      navigate({ name: 'dashboard' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec de connexion Google.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        await requestPasswordReset(email.trim());
        setSuccessMsg('Un e-mail de réinitialisation a été envoyé à cette adresse.');
      } else if (mode === 'register') {
        await registerWithEmail(email.trim(), password, fullName.trim());
        await refreshBootstrap();
        notify('success', 'Compte créé. Un e-mail de vérification a été envoyé.');
        navigate({ name: 'dashboard' });
      } else {
        await signInWithEmail(email.trim(), password);
        await refreshBootstrap();
        notify('success', 'Bon retour dans votre studio.');
        navigate({ name: 'dashboard' });
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/operation-not-allowed')) {
        setErrorMsg(
          'La connexion par e-mail/mot de passe n’est pas activée dans la console Firebase de ce projet. Utilisez « Continuer avec Google » ci-dessous ou activez le fournisseur Email/Password dans Firebase Authentication.'
        );
      } else {
        setErrorMsg(raw);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F8F8FA] dark:bg-[#0B0F1A] text-[#0F172A] dark:text-slate-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <button
          type="button"
          onClick={() => navigate({ name: 'landing' })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour à l’accueil</span>
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-xs space-y-6">
          <div>
            <div className="font-display text-sm font-bold text-[#6D28D9] dark:text-violet-400">
              EBOOK STUDIO AI
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
              {mode === 'register'
                ? 'Créer votre compte auteur'
                : mode === 'reset'
                  ? 'Réinitialiser le mot de passe'
                  : 'Connexion au Studio'}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Accédez à vos manuscrits, crédits IA et exports PDF/EPUB 3.
            </p>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-[#6D28D9] dark:text-violet-400" />
            <span>Continuer avec Google</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="mx-3 shrink text-[11px] text-slate-400">ou par e-mail</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1">Nom complet / Nom de plume</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Claire Moreau"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Adresse e-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="auteur@exemple.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-violet-600 cursor-pointer disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>
                {submitting
                  ? 'Traitement…'
                  : mode === 'register'
                    ? 'Créer mon compte'
                    : mode === 'reset'
                      ? 'Envoyer le lien de réinitialisation'
                      : 'Se connecter'}
              </span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600 dark:text-slate-400">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="hover:text-[#6D28D9] dark:hover:text-violet-400 cursor-pointer"
                >
                  Créer un compte
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="hover:text-[#6D28D9] dark:hover:text-violet-400 cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="hover:text-[#6D28D9] dark:hover:text-violet-400 cursor-pointer"
              >
                Déjà inscrit ? Se connecter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
