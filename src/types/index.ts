export type AppRoute =
  | { name: 'landing' }
  | { name: 'library' }
  | { name: 'book-detail'; bookId: string }
  | { name: 'reader'; bookId: string; chapter?: number }
  | { name: 'auth'; mode?: 'login' | 'register' | 'reset' }
  | { name: 'dashboard' }
  | { name: 'my-library' }
  | { name: 'projects' }
  | { name: 'studio'; bookId?: string; tab?: StudioTab; mode?: 'classic' | 'image' }
  | { name: 'illustrations' }
  | { name: 'templates' }
  | { name: 'favorites' }
  | { name: 'exports' }
  | { name: 'settings' }
  | { name: 'billing' }
  | { name: 'admin' };

export type StudioTab =
  | 'setup'
  | 'outline'
  | 'editor'
  | 'illustrations'
  | 'cover'
  | 'layout'
  | 'proofread'
  | 'export';

export interface CoverConfig {
  templateId: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: 'display' | 'serif' | 'mono';
  titleAlign: 'left' | 'center';
  showSubtitle: boolean;
  showAuthor: boolean;
  badgeText?: string;
  overlayOpacity: number;
}

export interface LayoutConfig {
  pageFormat: 'A4' | 'A5' | 'Letter';
  marginMm: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans' | 'mono';
  fontSizePt: number;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  includeToc: boolean;
  includeCoverPage: boolean;
}

export type PdfStandard = 'standard' | 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';

export interface Profile {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'business';
  preferredLocale: string;
  isActive: boolean;
  createdAt?: string;
}

export interface BookCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface BookLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isActive: boolean;
}

export interface BookTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  coverConfig: CoverConfig;
  layoutConfig: LayoutConfig;
  isPremium: boolean;
}

export interface PlanDefinition {
  id: 'free' | 'pro' | 'business';
  name: string;
  audience: string;
  priceMonthlyEur: number;
  priceAnnualEur: number;
  maxProjects: number;
  monthlyCredits: number;
  allowedExports: Array<'pdf' | 'epub' | 'html' | 'docx'>;
  allowAiIllustrations: boolean;
  allowPremiumTemplates: boolean;
  allowTeamSeats: boolean;
  highlights: string[];
}

export interface Book {
  id: string;
  authorProfileId: string;
  title: string;
  subtitle: string;
  authorName: string;
  subject: string;
  description: string;
  languageCode: string;
  categorySlug: string;
  targetAudience: string;
  writingStyle: string;
  targetChapters: number;
  targetLength: string;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  isImported: boolean;
  coverImageUrl: string | null;
  coverConfig: CoverConfig;
  layoutConfig: LayoutConfig;
  wordCount: number;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  contentHtml: string;
  wordCount: number;
  status: string;
  sortOrder: number;
  updatedAt: string;
}

export interface BookImage {
  id: string;
  bookId: string;
  chapterId: string | null;
  prompt: string;
  style: string;
  kind: string;
  imageUrl: string;
  createdAt: string;
}

export interface ProofreadReport {
  executiveSummary: string;
  structureFeedback: string;
  issues: Array<{
    chapterNumber: number;
    category: string;
    severity: string;
    excerpt: string;
    suggestion: string;
    explanation: string;
  }>;
}
