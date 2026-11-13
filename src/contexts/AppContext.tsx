import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, logoutFirebase } from '../lib/firebase';
import { getTranslator, isRtlLocale } from '../i18n/translations';
import type {
  AppRoute,
  BookCategory,
  BookLanguage,
  BookTemplate,
  PlanDefinition,
  Profile,
} from '../types';

export interface ToastMessage {
  id: string;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface BootstrapUserState {
  profile: Profile;
  creditBalance: number;
  subscription: {
    plan: string;
    status: string;
    billingCycle: string;
  } | null;
  notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>;
  favoriteBookIds: string[];
}

export interface BootstrapData {
  categories: BookCategory[];
  languages: BookLanguage[];
  templates: BookTemplate[];
  plans: PlanDefinition[];
  aiCosts: Record<string, number>;
  aiModels: { textModel: string; imageModel: string };
  siteConfig: {
    platformName: string;
    allowPublicRegistration: boolean;
    paymentIntegrationConfigured: boolean;
    geminiConfigured: boolean;
  };
  user: BootstrapUserState | null;
}

interface AppContextValue {
  route: AppRoute;
  navigate: (next: AppRoute) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  locale: string;
  setLocale: (code: string) => void;
  t: ReturnType<typeof getTranslator>;
  isRtl: boolean;
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  bootstrap: BootstrapData | null;
  loadingBootstrap: boolean;
  refreshBootstrap: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  notify: (kind: ToastMessage['kind'], text: string) => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<AppRoute>({ name: 'landing' });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('ebook_studio_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('ebook_studio_locale') || 'fr';
    }
    return 'fr';
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastMessage['kind'], text: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
      setTimeout(() => dismissToast(id), 5500);
    },
    [dismissToast]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('ebook_studio_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
    window.localStorage.setItem('ebook_studio_locale', locale);
  }, [locale]);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      let activeToken = idToken;
      if (auth.currentUser && !activeToken) {
        activeToken = await auth.currentUser.getIdToken();
      }
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      return await fetch(path, { ...init, headers });
    },
    [idToken]
  );

  const refreshBootstrap = useCallback(async () => {
    setLoadingBootstrap(true);
    try {
      const res = await apiFetch('/api/bootstrap');
      if (res.ok) {
        const data = (await res.json()) as BootstrapData;
        setBootstrap(data);
      }
    } catch (err) {
      console.error('Bootstrap fetch error:', err);
    } finally {
      setLoadingBootstrap(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (authReady) {
      void refreshBootstrap();
    }
  }, [authReady, idToken, refreshBootstrap]);

  const navigate = useCallback((next: AppRoute) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLocale = useCallback((code: string) => {
    setLocaleState(code);
  }, []);

  const signOut = useCallback(async () => {
    await logoutFirebase();
    setIdToken(null);
    navigate({ name: 'landing' });
    notify('info', 'Vous êtes déconnecté.');
  }, [navigate, notify]);

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        theme,
        toggleTheme,
        locale,
        setLocale,
        t: getTranslator(locale),
        isRtl: isRtlLocale(locale),
        firebaseUser,
        authReady,
        bootstrap,
        loadingBootstrap,
        refreshBootstrap,
        apiFetch,
        notify,
        toasts,
        dismissToast,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
