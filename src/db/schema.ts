import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

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

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull().default('Author'),
    avatarUrl: text('avatar_url'),
    role: text('role').notNull().default('user'), // 'user' | 'admin'
    plan: text('plan').notNull().default('free'), // 'free' | 'pro' | 'business'
    preferredLocale: text('preferred_locale').notNull().default('fr'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('profiles_uid_idx').on(table.uid), index('profiles_email_idx').on(table.email)]
);

export const bookCategories = pgTable('book_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bookLanguages = pgTable('book_languages', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  nativeName: text('native_name').notNull(),
  isRtl: boolean('is_rtl').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

export const bookTemplates = pgTable('book_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('general'),
  coverConfig: jsonb('cover_config').$type<CoverConfig>().notNull(),
  layoutConfig: jsonb('layout_config').$type<LayoutConfig>().notNull(),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const books = pgTable(
  'books',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorProfileId: uuid('author_profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull().default(''),
    authorName: text('author_name').notNull(),
    subject: text('subject').notNull().default(''),
    description: text('description').notNull().default(''),
    languageCode: text('language_code').notNull().default('fr'),
    categorySlug: text('category_slug').notNull().default('technology'),
    targetAudience: text('target_audience').notNull().default('Grand public'),
    writingStyle: text('writing_style').notNull().default('Professionnel et accessible'),
    targetChapters: integer('target_chapters').notNull().default(6),
    targetLength: text('target_length').notNull().default('medium'), // 'short' | 'medium' | 'long'
    status: text('status').notNull().default('draft'), // 'draft' | 'in_progress' | 'completed' | 'published'
    isPublic: boolean('is_public').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    isImported: boolean('is_imported').notNull().default(false),
    coverImageUrl: text('cover_image_url'),
    coverConfig: jsonb('cover_config').$type<CoverConfig>().notNull(),
    layoutConfig: jsonb('layout_config').$type<LayoutConfig>().notNull(),
    wordCount: integer('word_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    favoritesCount: integer('favorites_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('books_author_idx').on(table.authorProfileId),
    index('books_public_idx').on(table.isPublic),
    index('books_category_idx').on(table.categorySlug),
    index('books_language_idx').on(table.languageCode),
  ]
);

export const bookChapters = pgTable(
  'book_chapters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    chapterNumber: integer('chapter_number').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    contentHtml: text('content_html').notNull().default(''),
    wordCount: integer('word_count').notNull().default(0),
    status: text('status').notNull().default('outline'), // 'outline' | 'draft' | 'completed'
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('book_chapters_book_idx').on(table.bookId)]
);

export const bookSections = pgTable(
  'book_sections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chapterId: uuid('chapter_id')
      .references(() => bookChapters.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('book_sections_chapter_idx').on(table.chapterId)]
);

export const bookImages = pgTable(
  'book_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    chapterId: uuid('chapter_id').references(() => bookChapters.id, { onDelete: 'set null' }),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    prompt: text('prompt').notNull(),
    style: text('style').notNull().default('editorial'),
    kind: text('kind').notNull().default('illustration'), // 'cover' | 'chapter' | 'illustration'
    imageUrl: text('image_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('book_images_book_idx').on(table.bookId)]
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('favorites_profile_book_idx').on(table.profileId, table.bookId)]
);

export const readingProgress = pgTable(
  'reading_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    currentChapterNumber: integer('current_chapter_number').notNull().default(1),
    scrollPercent: integer('scroll_percent').notNull().default(0),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('reading_progress_profile_book_idx').on(table.profileId, table.bookId)]
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    chapterNumber: integer('chapter_number').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('bookmarks_profile_book_idx').on(table.profileId, table.bookId)]
);

export const aiCreditBalances = pgTable('ai_credit_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  balance: integer('balance').notNull().default(100),
  monthlyAllowance: integer('monthly_allowance').notNull().default(100),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiCreditTransactions = pgTable(
  'ai_credit_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(), // negative for usage, positive for grant/purchase
    type: text('type').notNull(), // 'grant' | 'usage' | 'purchase' | 'refund'
    action: text('action').notNull(),
    description: text('description').notNull(),
    idempotencyKey: text('idempotency_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('ai_credit_tx_profile_idx').on(table.profileId)]
);

export const aiGenerations = pgTable(
  'ai_generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id').references(() => books.id, { onDelete: 'set null' }),
    model: text('model').notNull(),
    action: text('action').notNull(),
    promptSummary: text('prompt_summary').notNull(),
    creditsCharged: integer('credits_charged').notNull().default(0),
    status: text('status').notNull().default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('ai_generations_profile_idx').on(table.profileId)]
);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  plan: text('plan').notNull().default('free'), // 'free' | 'pro' | 'business'
  status: text('status').notNull().default('active'), // 'active' | 'canceled' | 'unconfigured_pending'
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  provider: text('provider').notNull().default('manual'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  plan: text('plan').notNull(),
  amountCents: integer('amount_cents').notNull().default(0),
  currency: text('currency').notNull().default('EUR'),
  status: text('status').notNull().default('recorded'),
  provider: text('provider').notNull().default('extensible'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exportsTable = pgTable(
  'exports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    format: text('format').notNull(), // 'pdf' | 'epub' | 'html' | 'docx'
    fileName: text('file_name').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull().default(0),
    status: text('status').notNull().default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('exports_profile_idx').on(table.profileId)]
);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id')
    .references(() => books.id, { onDelete: 'cascade' })
    .notNull(),
  profileId: uuid('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull().default(''),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id')
    .references(() => books.id, { onDelete: 'cascade' })
    .notNull(),
  reporterProfileId: uuid('reporter_profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull().default(''),
  status: text('status').notNull().default('open'), // 'open' | 'reviewed' | 'resolved' | 'dismissed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorProfileId: uuid('actor_profile_id').references(() => profiles.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Drizzle Relations
export const profilesRelations = relations(profiles, ({ many, one }) => ({
  books: many(books),
  favorites: many(favorites),
  creditBalance: one(aiCreditBalances),
  subscription: one(subscriptions),
  exports: many(exportsTable),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  author: one(profiles, { fields: [books.authorProfileId], references: [profiles.id] }),
  chapters: many(bookChapters),
  images: many(bookImages),
  reviews: many(reviews),
}));

export const bookChaptersRelations = relations(bookChapters, ({ one, many }) => ({
  book: one(books, { fields: [bookChapters.bookId], references: [books.id] }),
  sections: many(bookSections),
}));

export const bookSectionsRelations = relations(bookSections, ({ one }) => ({
  chapter: one(bookChapters, { fields: [bookSections.chapterId], references: [bookChapters.id] }),
}));
