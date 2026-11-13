export interface LocaleOption {
  code: string;
  nativeName: string;
  isRtl: boolean;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'fr', nativeName: 'Français', isRtl: false },
  { code: 'en', nativeName: 'English', isRtl: false },
  { code: 'ar', nativeName: 'العربية', isRtl: true },
  { code: 'de', nativeName: 'Deutsch', isRtl: false },
  { code: 'es', nativeName: 'Español', isRtl: false },
  { code: 'pt', nativeName: 'Português', isRtl: false },
  { code: 'it', nativeName: 'Italiano', isRtl: false },
  { code: 'tr', nativeName: 'Türkçe', isRtl: false },
  { code: 'nl', nativeName: 'Nederlands', isRtl: false },
  { code: 'zh', nativeName: '中文', isRtl: false },
  { code: 'ja', nativeName: '日本語', isRtl: false },
];

type TranslationDict = {
  brand: string;
  navLibrary: string;
  navFeatures: string;
  navPricing: string;
  navStudio: string;
  navDashboard: string;
  navLogin: string;
  navStartFree: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  libraryTitle: string;
  librarySubtitle: string;
  searchPlaceholder: string;
  readBook: string;
  addFavorite: string;
  removeFavorite: string;
  dashboardTitle: string;
  newEbook: string;
  creditsAvailable: string;
  booksCreated: string;
  inProgress: string;
  completedBooks: string;
  sidebarDashboard: string;
  sidebarMyLibrary: string;
  sidebarCreateEbook: string;
  sidebarMyProjects: string;
  sidebarAiWriter: string;
  sidebarIllustrations: string;
  sidebarTemplates: string;
  sidebarFavorites: string;
  sidebarExports: string;
  sidebarSettings: string;
  sidebarBilling: string;
  sidebarAdmin: string;
  logout: string;
};

const BASE_FR: TranslationDict = {
  brand: 'EBOOK STUDIO AI',
  navLibrary: 'Bibliothèque',
  navFeatures: 'Fonctionnalités',
  navPricing: 'Tarifs',
  navStudio: 'Studio',
  navDashboard: 'Tableau de bord',
  navLogin: 'Se connecter',
  navStartFree: 'Commencer gratuitement',
  heroTitle: 'Concevez, illustrez et publiez vos eBooks professionnels en un seul studio.',
  heroSubtitle:
    'De la génération de plans structurés à l’export PDF et EPUB 3, EBOOK STUDIO AI réunit rédaction assistée, conception de couvertures et bibliothèque numérique.',
  heroCtaPrimary: 'Commencer gratuitement',
  heroCtaSecondary: 'Explorer la bibliothèque',
  libraryTitle: 'Bibliothèque numérique',
  librarySubtitle: 'Consultez des ouvrages de démonstration et les publications ouvertes de la communauté.',
  searchPlaceholder: 'Rechercher un titre, un auteur ou un thème…',
  readBook: 'Lire le livre',
  addFavorite: 'Ajouter aux favoris',
  removeFavorite: 'Retirer des favoris',
  dashboardTitle: 'Espace auteur',
  newEbook: 'Nouvel eBook',
  creditsAvailable: 'Crédits IA disponibles',
  booksCreated: 'Livres créés',
  inProgress: 'Projets en cours',
  completedBooks: 'Livres terminés',
  sidebarDashboard: 'Dashboard',
  sidebarMyLibrary: 'My Library',
  sidebarCreateEbook: 'Create eBook',
  sidebarMyProjects: 'My Projects',
  sidebarAiWriter: 'AI Writer',
  sidebarIllustrations: 'AI Illustrations',
  sidebarTemplates: 'Templates',
  sidebarFavorites: 'Favorites',
  sidebarExports: 'Export Center',
  sidebarSettings: 'Settings',
  sidebarBilling: 'Billing',
  sidebarAdmin: 'Administration',
  logout: 'Déconnexion',
};

const TRANSLATIONS: Record<string, Partial<TranslationDict>> = {
  fr: BASE_FR,
  en: {
    navLibrary: 'Library',
    navFeatures: 'Features',
    navPricing: 'Pricing',
    navStudio: 'Studio',
    navDashboard: 'Dashboard',
    navLogin: 'Sign in',
    navStartFree: 'Start for free',
    heroTitle: 'Write, illustrate, and publish professional eBooks inside one focused studio.',
    heroSubtitle:
      'From structured outlines and chapter drafting to cover design and clean PDF / EPUB 3 exports, EBOOK STUDIO AI unifies every step of digital publishing.',
    heroCtaPrimary: 'Start for free',
    heroCtaSecondary: 'Browse library',
    libraryTitle: 'Digital Library',
    librarySubtitle: 'Explore curated demonstration books and published community editions.',
    searchPlaceholder: 'Search by title, author, or topic…',
    readBook: 'Read book',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove favorite',
    dashboardTitle: 'Author Workspace',
    newEbook: 'New eBook',
    creditsAvailable: 'AI credits available',
    booksCreated: 'Books created',
    inProgress: 'In progress',
    completedBooks: 'Completed books',
    sidebarAdmin: 'Admin Console',
    logout: 'Sign out',
  },
  ar: {
    navLibrary: 'المكتبة',
    navFeatures: 'المميزات',
    navPricing: 'الأسعار',
    navStudio: 'الاستوديو',
    navDashboard: 'لوحة التحكم',
    navLogin: 'تسجيل الدخول',
    navStartFree: 'ابدأ مجاناً',
    heroTitle: 'صمّم واكتب وانشر كتبك الإلكترونية الاحترافية في استوديو متكامل.',
    heroSubtitle:
      'من توليد الفهارس وكتابة الفصول بالذكاء الاصطناعي إلى تصميم الأغلفة والتصدير الفعلي بصيغتي PDF و EPUB 3.',
    heroCtaPrimary: 'ابدأ مجاناً',
    heroCtaSecondary: 'تصفح المكتبة',
    libraryTitle: 'المكتبة الرقمية',
    librarySubtitle: 'استكشف الكتب التجريبية والإصدارات المنشورة مع دعم القراءة المتكاملة.',
    searchPlaceholder: 'ابحث بالعنوان أو المؤلف أو الموضوع…',
    readBook: 'قراءة الكتاب',
    addFavorite: 'إضافة للمفضلة',
    removeFavorite: 'إزالة من المفضلة',
    dashboardTitle: 'مساحة المؤلف',
    newEbook: 'كتاب جديد',
    creditsAvailable: 'رصيد الذكاء الاصطناعي',
    booksCreated: 'الكتب المنشأة',
    inProgress: 'قيد التنفيذ',
    completedBooks: 'الكتب المكتملة',
    sidebarDashboard: 'لوحة التحكم',
    sidebarMyLibrary: 'مكتبتي',
    sidebarCreateEbook: 'إنشاء كتاب',
    sidebarMyProjects: 'مشاريعي',
    sidebarAiWriter: 'الكاتب الذكي',
    sidebarIllustrations: 'الرسوم التوضيحية',
    sidebarTemplates: 'القوالب',
    sidebarFavorites: 'المفضلة',
    sidebarExports: 'مركز التصدير',
    sidebarSettings: 'الإعدادات',
    sidebarBilling: 'الاشتراك والرصيد',
    sidebarAdmin: 'لوحة الإدارة',
    logout: 'تسجيل الخروج',
  },
  es: {
    navLibrary: 'Biblioteca',
    navFeatures: 'Funciones',
    navPricing: 'Precios',
    navLogin: 'Iniciar sesión',
    navStartFree: 'Empezar gratis',
    heroTitle: 'Crea, ilustra y publica tus eBooks profesionales en un único estudio.',
    libraryTitle: 'Biblioteca digital',
    searchPlaceholder: 'Buscar por título, autor o tema…',
    readBook: 'Leer libro',
    newEbook: 'Nuevo eBook',
    logout: 'Cerrar sesión',
  },
  de: {
    navLibrary: 'Bibliothek',
    navFeatures: 'Funktionen',
    navPricing: 'Preise',
    navLogin: 'Anmelden',
    navStartFree: 'Kostenlos starten',
    heroTitle: 'Entwerfen, illustrieren und veröffentlichen Sie professionelle E-Books in einem Studio.',
    libraryTitle: 'Digitale Bibliothek',
    searchPlaceholder: 'Nach Titel, Autor oder Thema suchen…',
    readBook: 'Buch lesen',
    newEbook: 'Neues E-Book',
    logout: 'Abmelden',
  },
  pt: {
    navLibrary: 'Biblioteca',
    navFeatures: 'Recursos',
    navPricing: 'Planos',
    navLogin: 'Entrar',
    navStartFree: 'Começar grátis',
    readBook: 'Ler livro',
    newEbook: 'Novo eBook',
  },
  it: {
    navLibrary: 'Biblioteca',
    navFeatures: 'Funzionalità',
    navPricing: 'Prezzi',
    navLogin: 'Accedi',
    navStartFree: 'Inizia gratis',
    readBook: 'Leggi libro',
    newEbook: 'Nuovo eBook',
  },
  tr: {
    navLibrary: 'Kütüphane',
    navFeatures: 'Özellikler',
    navPricing: 'Fiyatlar',
    navLogin: 'Giriş Yap',
    navStartFree: 'Ücretsiz Başla',
    readBook: 'Kitabı Oku',
    newEbook: 'Yeni e-Kitap',
  },
  nl: {
    navLibrary: 'Bibliotheek',
    navFeatures: 'Functies',
    navPricing: 'Prijzen',
    navLogin: 'Inloggen',
    navStartFree: 'Gratis starten',
    readBook: 'Boek lezen',
    newEbook: 'Nieuw eBook',
  },
  zh: {
    navLibrary: '数字图书馆',
    navFeatures: '核心功能',
    navPricing: '定价方案',
    navLogin: '登录',
    navStartFree: '免费开始',
    readBook: '阅读电子书',
    newEbook: '新建电子书',
  },
  ja: {
    navLibrary: 'ライブラリ',
    navFeatures: '機能',
    navPricing: '料金',
    navLogin: 'ログイン',
    navStartFree: '無料で始める',
    readBook: '本を読む',
    newEbook: '新しい電子書籍',
  },
};

export function getTranslator(locale: string): TranslationDict {
  const override = TRANSLATIONS[locale] || TRANSLATIONS.en || {};
  return { ...BASE_FR, ...override };
}

export function isRtlLocale(locale: string): boolean {
  return locale === 'ar';
}
