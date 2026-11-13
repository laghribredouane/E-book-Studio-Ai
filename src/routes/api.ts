import { Router } from 'express';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  aiCreditBalances,
  aiCreditTransactions,
  aiGenerations,
  auditLogs,
  bookCategories,
  bookChapters,
  bookImages,
  bookLanguages,
  bookmarks,
  books,
  bookTemplates,
  exportsTable,
  favorites,
  notifications,
  paymentTransactions,
  platformSettings,
  profiles,
  readingProgress,
  reports,
  reviews,
  subscriptions,
  type CoverConfig,
  type LayoutConfig,
} from '../db/schema.ts';
import { ensureSeeded } from '../db/seed.ts';
import { AuthRequest, optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.ts';
import { chargeCreditsAtomic, getAiCosts, getCreditBalance, refundCreditsAtomic } from '../services/credits.ts';
import {
  generateBookIllustration,
  generateBookOutline,
  generateChapterDraft,
  getConfiguredModels,
  proofreadManuscript,
  runAiTextTool,
} from '../services/ai-gemini.ts';
import {
  generateDocxBuffer,
  generateEpubBuffer,
  generateHtmlString,
  generatePdfBuffer,
} from '../services/exporter.ts';
import { PLAN_CATALOG, type PlanId } from '../lib/plans.ts';

export const apiRouter = Router();

// Simple sliding-window rate limiter for AI endpoints
const aiRateLimitMap = new Map<string, number[]>();
function checkAiRateLimit(profileId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 20;
  const timestamps = (aiRateLimitMap.get(profileId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    aiRateLimitMap.set(profileId, timestamps);
    return false;
  }
  timestamps.push(now);
  aiRateLimitMap.set(profileId, timestamps);
  return true;
}

const DEFAULT_COVER: CoverConfig = {
  templateId: 'midnight-editorial',
  backgroundColor: '#0F172A',
  accentColor: '#D97706',
  textColor: '#FFFFFF',
  fontFamily: 'display',
  titleAlign: 'left',
  showSubtitle: true,
  showAuthor: true,
  badgeText: 'Édition Studio',
  overlayOpacity: 0.45,
};

const DEFAULT_LAYOUT: LayoutConfig = {
  pageFormat: 'A5',
  marginMm: 20,
  lineHeight: 1.65,
  fontFamily: 'serif',
  fontSizePt: 11,
  showHeader: true,
  showFooter: true,
  showPageNumbers: true,
  includeToc: true,
  includeCoverPage: true,
};

function countWordsInHtml(html: string): number {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.split(' ').length : 0;
}

async function recalculateBookWordCount(bookId: string) {
  const chapters = await db.select().from(bookChapters).where(eq(bookChapters.bookId, bookId));
  const total = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  await db
    .update(books)
    .set({ wordCount: total, updatedAt: new Date() })
    .where(eq(books.id, bookId));
  return total;
}

async function logAudit(
  actorProfileId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await db.insert(auditLogs).values({
      actorProfileId,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}

// Health check
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ebook-studio-ai' });
});

// Bootstrap data (public + optional authenticated user state)
apiRouter.get('/bootstrap', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [categories, languages, templates, aiCosts, aiModels, siteRows] = await Promise.all([
      db.select().from(bookCategories).orderBy(bookCategories.sortOrder),
      db.select().from(bookLanguages).where(eq(bookLanguages.isActive, true)),
      db.select().from(bookTemplates).orderBy(bookTemplates.createdAt),
      getAiCosts(),
      getConfiguredModels(),
      db.select().from(platformSettings).where(eq(platformSettings.key, 'site_config')).limit(1),
    ]);

    const siteConfig = (siteRows[0]?.value as Record<string, unknown>) || {
      platformName: 'EBOOK STUDIO AI',
      allowPublicRegistration: true,
      paymentIntegrationConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    };

    let userPayload: Record<string, unknown> | null = null;
    if (req.profile) {
      const [creditBalance, subRows, notifRows, userFavs] = await Promise.all([
        getCreditBalance(req.profile.id),
        db.select().from(subscriptions).where(eq(subscriptions.profileId, req.profile.id)).limit(1),
        db
          .select()
          .from(notifications)
          .where(eq(notifications.profileId, req.profile.id))
          .orderBy(desc(notifications.createdAt))
          .limit(10),
        db.select().from(favorites).where(eq(favorites.profileId, req.profile.id)),
      ]);

      userPayload = {
        profile: req.profile,
        creditBalance,
        subscription: subRows[0] ?? null,
        notifications: notifRows,
        favoriteBookIds: userFavs.map((f) => f.bookId),
      };
    }

    res.json({
      categories,
      languages,
      templates,
      plans: Object.values(PLAN_CATALOG),
      aiCosts,
      aiModels,
      siteConfig: {
        ...siteConfig,
        paymentIntegrationConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        geminiConfigured: Boolean(
          process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
        ),
      },
      user: userPayload,
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement de la plateforme.' });
  }
});

// Public Library Catalog
apiRouter.get('/books', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const language = String(req.query.language || '').trim();
    const author = String(req.query.author || '').trim();
    const sort = String(req.query.sort || 'popular');

    const conditions = [eq(books.isPublic, true)];
    if (category && category !== 'all') {
      conditions.push(eq(books.categorySlug, category));
    }
    if (language && language !== 'all') {
      conditions.push(eq(books.languageCode, language));
    }
    if (author && author !== 'all') {
      conditions.push(ilike(books.authorName, `%${author}%`));
    }
    if (q) {
      const searchCond = or(
        ilike(books.title, `%${q}%`),
        ilike(books.subtitle, `%${q}%`),
        ilike(books.authorName, `%${q}%`),
        ilike(books.description, `%${q}%`)
      );
      if (searchCond) conditions.push(searchCond);
    }

    const orderBy =
      sort === 'newest'
        ? desc(books.createdAt)
        : sort === 'title'
          ? books.title
          : desc(books.viewsCount);

    const rows = await db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(100);

    res.json({ books: rows });
  } catch (error) {
    console.error('Public books query failed:', error);
    res.status(500).json({ error: 'Impossible de charger la bibliothèque publique.' });
  }
});

// Get single book details + chapters + images + reader state
apiRouter.get('/books/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const bookId = String(req.params.id);
    const bookRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRows.length === 0) {
      return res.status(404).json({ error: 'Livre introuvable.' });
    }
    const book = bookRows[0];

    const isOwner = Boolean(req.profile && book.authorProfileId === req.profile.id);
    const isAdmin = req.profile?.role === 'admin';
    if (!book.isPublic && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Ce manuscrit est privé.' });
    }

    const [chapters, images, bookReviews] = await Promise.all([
      db
        .select()
        .from(bookChapters)
        .where(eq(bookChapters.bookId, bookId))
        .orderBy(bookChapters.sortOrder, bookChapters.chapterNumber),
      db.select().from(bookImages).where(eq(bookImages.bookId, bookId)).orderBy(desc(bookImages.createdAt)),
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          reviewerName: profiles.fullName,
        })
        .from(reviews)
        .innerJoin(profiles, eq(reviews.profileId, profiles.id))
        .where(and(eq(reviews.bookId, bookId), eq(reviews.isHidden, false)))
        .orderBy(desc(reviews.createdAt)),
    ]);

    let isFavorited = false;
    let progress = null;
    let userBookmarks: Array<typeof bookmarks.$inferSelect> = [];

    if (req.profile) {
      const [favRows, progRows, bmRows] = await Promise.all([
        db
          .select()
          .from(favorites)
          .where(and(eq(favorites.profileId, req.profile.id), eq(favorites.bookId, bookId)))
          .limit(1),
        db
          .select()
          .from(readingProgress)
          .where(and(eq(readingProgress.profileId, req.profile.id), eq(readingProgress.bookId, bookId)))
          .limit(1),
        db
          .select()
          .from(bookmarks)
          .where(and(eq(bookmarks.profileId, req.profile.id), eq(bookmarks.bookId, bookId)))
          .orderBy(bookmarks.chapterNumber),
      ]);
      isFavorited = favRows.length > 0;
      progress = progRows[0] ?? null;
      userBookmarks = bmRows;
    }

    res.json({
      book,
      chapters,
      images,
      reviews: bookReviews,
      isFavorited,
      progress,
      bookmarks: userBookmarks,
      canEdit: isOwner || isAdmin,
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Impossible de charger les détails du livre.' });
  }
});

apiRouter.post('/books/:id/view', async (req, res) => {
  try {
    const bookId = String(req.params.id);
    await db
      .update(books)
      .set({ viewsCount: sql`${books.viewsCount} + 1` })
      .where(eq(books.id, bookId));
    res.json({ ok: true });
  } catch {
    res.status(200).json({ ok: false });
  }
});

// My Personal Library & Projects
apiRouter.get('/my/books', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(books)
      .where(eq(books.authorProfileId, req.profile!.id))
      .orderBy(desc(books.updatedAt));

    const favRows = await db
      .select({ book: books })
      .from(favorites)
      .innerJoin(books, eq(favorites.bookId, books.id))
      .where(eq(favorites.profileId, req.profile!.id))
      .orderBy(desc(favorites.createdAt));

    const recentProgress = await db
      .select({
        progress: readingProgress,
        book: books,
      })
      .from(readingProgress)
      .innerJoin(books, eq(readingProgress.bookId, books.id))
      .where(eq(readingProgress.profileId, req.profile!.id))
      .orderBy(desc(readingProgress.lastReadAt))
      .limit(10);

    res.json({
      books: rows,
      favorites: favRows.map((r) => r.book),
      recentReading: recentProgress,
    });
  } catch (error) {
    console.error('My books fetch failed:', error);
    res.status(500).json({ error: 'Impossible de charger vos projets.' });
  }
});

// Create a new eBook project
apiRouter.post('/books', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = req.profile!;
    const planDef = PLAN_CATALOG[(profile.plan as PlanId) || 'free'] || PLAN_CATALOG.free;
    const existingCountRows = await db
      .select({ total: count() })
      .from(books)
      .where(eq(books.authorProfileId, profile.id));
    const currentCount = Number(existingCountRows[0]?.total ?? 0);

    if (currentCount >= planDef.maxProjects && profile.role !== 'admin') {
      return res.status(403).json({
        error: `Limite atteinte (${planDef.maxProjects} projets maximum pour l’offre ${planDef.name}). Passez à une offre supérieure ou supprimez un brouillon.`,
      });
    }

    const body = req.body || {};
    const title = String(body.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Le titre du livre est requis.' });
    }

    const coverConfig: CoverConfig = { ...DEFAULT_COVER, ...(body.coverConfig || {}) };
    const layoutConfig: LayoutConfig = { ...DEFAULT_LAYOUT, ...(body.layoutConfig || {}) };

    const inserted = await db
      .insert(books)
      .values({
        authorProfileId: profile.id,
        title,
        subtitle: String(body.subtitle || ''),
        authorName: String(body.authorName || profile.fullName),
        subject: String(body.subject || ''),
        description: String(body.description || ''),
        languageCode: String(body.languageCode || 'fr'),
        categorySlug: String(body.categorySlug || 'technology'),
        targetAudience: String(body.targetAudience || 'Grand public'),
        writingStyle: String(body.writingStyle || 'Professionnel et accessible'),
        targetChapters: Math.min(30, Math.max(1, Number(body.targetChapters || 6))),
        targetLength: String(body.targetLength || 'medium'),
        status: 'draft',
        isPublic: false,
        coverImageUrl: body.coverImageUrl || null,
        coverConfig,
        layoutConfig,
      })
      .returning();

    const createdBook = inserted[0];
    await logAudit(profile.id, 'book_created', 'book', createdBook.id, { title: createdBook.title });

    res.status(201).json({ book: createdBook });
  } catch (error) {
    console.error('Create book failed:', error);
    res.status(500).json({ error: 'Erreur lors de la création du projet.' });
  }
});

// Import an existing manuscript (.txt, .md, .html)
apiRouter.post('/books/import', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = req.profile!;
    const planDef = PLAN_CATALOG[(profile.plan as PlanId) || 'free'] || PLAN_CATALOG.free;
    const existingCountRows = await db
      .select({ total: count() })
      .from(books)
      .where(eq(books.authorProfileId, profile.id));
    if (Number(existingCountRows[0]?.total ?? 0) >= planDef.maxProjects && profile.role !== 'admin') {
      return res.status(403).json({
        error: `Limite de projets atteinte (${planDef.maxProjects}) pour l’offre ${planDef.name}.`,
      });
    }

    const { title, authorName, languageCode, categorySlug, rawContent, fileName } = req.body || {};
    const contentStr = String(rawContent || '').trim();
    if (!contentStr || contentStr.length > 500_000) {
      return res.status(400).json({
        error: 'Fichier invalide ou trop volumineux (max 500 000 caractères).',
      });
    }

    const safeTitle = String(title || fileName || 'Manuscrit importé').replace(/\.(txt|md|html?)$/i, '');
    const inserted = await db
      .insert(books)
      .values({
        authorProfileId: profile.id,
        title: safeTitle,
        subtitle: 'Manuscrit importé dans le studio',
        authorName: String(authorName || profile.fullName),
        subject: safeTitle,
        description: `Importé depuis ${fileName || 'un document texte'}`,
        languageCode: String(languageCode || 'fr'),
        categorySlug: String(categorySlug || 'literature'),
        status: 'in_progress',
        isImported: true,
        coverConfig: DEFAULT_COVER,
        layoutConfig: DEFAULT_LAYOUT,
      })
      .returning();

    const book = inserted[0];

    // Split into chapters by markdown headings `# ` or `Chapitre` lines
    const sections = contentStr.split(/(?=^#\s+|^Chapitre\s+\d+|^Chapter\s+\d+)/im).filter((s) => s.trim());
    const chunks = sections.length > 0 ? sections : [contentStr];

    let totalWords = 0;
    for (let i = 0; i < chunks.length; i++) {
      const lines = chunks[i].trim().split('\n');
      const heading = lines[0].replace(/^#+\s*/, '').trim() || `Chapitre ${i + 1}`;
      const bodyLines = lines.slice(1).join('\n').trim() || chunks[i].trim();
      const html = bodyLines
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</p>`)
        .join('\n');
      const wc = countWordsInHtml(html);
      totalWords += wc;

      await db.insert(bookChapters).values({
        bookId: book.id,
        chapterNumber: i + 1,
        title: heading.slice(0, 140),
        summary: '',
        contentHtml: html,
        wordCount: wc,
        status: 'draft',
        sortOrder: i + 1,
      });
    }

    const [updated] = await db
      .update(books)
      .set({ wordCount: totalWords })
      .where(eq(books.id, book.id))
      .returning();

    res.status(201).json({ book: updated });
  } catch (error) {
    console.error('Import book failed:', error);
    res.status(500).json({ error: 'Impossible d’importer ce manuscrit.' });
  }
});

// Update book metadata / cover / layout / publish status
apiRouter.patch('/books/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const existing = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });

    const book = existing[0];
    if (book.authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const b = req.body || {};
    const updateData: Partial<typeof books.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (b.title !== undefined) updateData.title = String(b.title);
    if (b.subtitle !== undefined) updateData.subtitle = String(b.subtitle);
    if (b.authorName !== undefined) updateData.authorName = String(b.authorName);
    if (b.subject !== undefined) updateData.subject = String(b.subject);
    if (b.description !== undefined) updateData.description = String(b.description);
    if (b.languageCode !== undefined) updateData.languageCode = String(b.languageCode);
    if (b.categorySlug !== undefined) updateData.categorySlug = String(b.categorySlug);
    if (b.targetAudience !== undefined) updateData.targetAudience = String(b.targetAudience);
    if (b.writingStyle !== undefined) updateData.writingStyle = String(b.writingStyle);
    if (b.targetChapters !== undefined) updateData.targetChapters = Number(b.targetChapters);
    if (b.targetLength !== undefined) updateData.targetLength = String(b.targetLength);
    if (b.status !== undefined) updateData.status = String(b.status);
    if (b.isPublic !== undefined) updateData.isPublic = Boolean(b.isPublic);
    if (b.coverImageUrl !== undefined) updateData.coverImageUrl = b.coverImageUrl;
    if (b.coverConfig !== undefined) updateData.coverConfig = b.coverConfig;
    if (b.layoutConfig !== undefined) updateData.layoutConfig = b.layoutConfig;

    const [updated] = await db.update(books).set(updateData).where(eq(books.id, bookId)).returning();
    res.json({ book: updated });
  } catch (error) {
    console.error('Update book failed:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour le livre.' });
  }
});

// Duplicate a project
apiRouter.post('/books/:id/duplicate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = req.profile!;
    const planDef = PLAN_CATALOG[(profile.plan as PlanId) || 'free'] || PLAN_CATALOG.free;
    const existingCountRows = await db
      .select({ total: count() })
      .from(books)
      .where(eq(books.authorProfileId, profile.id));
    if (Number(existingCountRows[0]?.total ?? 0) >= planDef.maxProjects && profile.role !== 'admin') {
      return res.status(403).json({
        error: `Limite de projets atteinte (${planDef.maxProjects}) pour l’offre ${planDef.name}.`,
      });
    }

    const sourceId = String(req.params.id);
    const sourceRows = await db.select().from(books).where(eq(books.id, sourceId)).limit(1);
    if (sourceRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    const src = sourceRows[0];

    if (!src.isPublic && src.authorProfileId !== profile.id && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const [cloned] = await db
      .insert(books)
      .values({
        authorProfileId: profile.id,
        title: `${src.title} (Copie)`,
        subtitle: src.subtitle,
        authorName: profile.fullName,
        subject: src.subject,
        description: src.description,
        languageCode: src.languageCode,
        categorySlug: src.categorySlug,
        targetAudience: src.targetAudience,
        writingStyle: src.writingStyle,
        targetChapters: src.targetChapters,
        targetLength: src.targetLength,
        status: 'draft',
        isPublic: false,
        coverImageUrl: src.coverImageUrl,
        coverConfig: src.coverConfig,
        layoutConfig: src.layoutConfig,
        wordCount: src.wordCount,
      })
      .returning();

    const chapters = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, src.id))
      .orderBy(bookChapters.sortOrder);

    for (const ch of chapters) {
      await db.insert(bookChapters).values({
        bookId: cloned.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        summary: ch.summary,
        contentHtml: ch.contentHtml,
        wordCount: ch.wordCount,
        status: ch.status,
        sortOrder: ch.sortOrder,
      });
    }

    res.status(201).json({ book: cloned });
  } catch (error) {
    console.error('Duplicate book failed:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication.' });
  }
});

// Delete a book
apiRouter.delete('/books/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const existing = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    if (existing[0].authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await db.delete(books).where(eq(books.id, bookId));
    await logAudit(req.profile!.id, 'book_deleted', 'book', bookId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete book failed:', error);
    res.status(500).json({ error: 'Impossible de supprimer le livre.' });
  }
});

// Chapters CRUD
apiRouter.post('/books/:id/chapters', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const existing = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    if (existing[0].authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const currentChapters = await db.select().from(bookChapters).where(eq(bookChapters.bookId, bookId));
    const nextNum = currentChapters.length + 1;
    const { title, summary, contentHtml } = req.body || {};
    const html = String(contentHtml || '');

    const [chapter] = await db
      .insert(bookChapters)
      .values({
        bookId,
        chapterNumber: nextNum,
        title: String(title || `Chapitre ${nextNum}`),
        summary: String(summary || ''),
        contentHtml: html,
        wordCount: countWordsInHtml(html),
        status: html ? 'draft' : 'outline',
        sortOrder: nextNum,
      })
      .returning();

    await recalculateBookWordCount(bookId);
    res.status(201).json({ chapter });
  } catch (error) {
    console.error('Add chapter failed:', error);
    res.status(500).json({ error: 'Impossible d’ajouter le chapitre.' });
  }
});

apiRouter.patch('/books/:id/chapters/:chapterId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const chapterId = String(req.params.chapterId);
    const bookRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    if (bookRows[0].authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const { title, summary, contentHtml, status } = req.body || {};
    const updates: Partial<typeof bookChapters.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = String(title);
    if (summary !== undefined) updates.summary = String(summary);
    if (status !== undefined) updates.status = String(status);
    if (contentHtml !== undefined) {
      updates.contentHtml = String(contentHtml);
      updates.wordCount = countWordsInHtml(String(contentHtml));
      if (!status) updates.status = updates.wordCount > 40 ? 'draft' : 'outline';
    }

    const [updated] = await db
      .update(bookChapters)
      .set(updates)
      .where(and(eq(bookChapters.id, chapterId), eq(bookChapters.bookId, bookId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Chapitre introuvable.' });

    const totalWords = await recalculateBookWordCount(bookId);
    res.json({ chapter: updated, bookWordCount: totalWords });
  } catch (error) {
    console.error('Update chapter failed:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du chapitre.' });
  }
});

apiRouter.delete('/books/:id/chapters/:chapterId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const chapterId = String(req.params.chapterId);
    const bookRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    if (bookRows[0].authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await db.delete(bookChapters).where(and(eq(bookChapters.id, chapterId), eq(bookChapters.bookId, bookId)));

    const remaining = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, bookId))
      .orderBy(bookChapters.sortOrder, bookChapters.chapterNumber);

    for (let i = 0; i < remaining.length; i++) {
      await db
        .update(bookChapters)
        .set({ chapterNumber: i + 1, sortOrder: i + 1 })
        .where(eq(bookChapters.id, remaining[i].id));
    }

    await recalculateBookWordCount(bookId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete chapter failed:', error);
    res.status(500).json({ error: 'Impossible de supprimer le chapitre.' });
  }
});

apiRouter.post('/books/:id/chapters/reorder', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const bookRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    if (bookRows[0].authorProfileId !== req.profile!.id && req.profile!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const orderedIds = Array.isArray(req.body?.orderedChapterIds)
      ? (req.body.orderedChapterIds as string[])
      : [];

    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(bookChapters)
        .set({ chapterNumber: i + 1, sortOrder: i + 1, updatedAt: new Date() })
        .where(and(eq(bookChapters.id, orderedIds[i]), eq(bookChapters.bookId, bookId)));
    }

    const updatedChapters = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, bookId))
      .orderBy(bookChapters.sortOrder);

    res.json({ chapters: updatedChapters });
  } catch (error) {
    console.error('Reorder chapters failed:', error);
    res.status(500).json({ error: 'Impossible de réorganiser les chapitres.' });
  }
});

// Favorites, Reading Progress, Bookmarks, Reviews, Reports
apiRouter.post('/books/:id/favorite', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const profileId = req.profile!.id;
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.profileId, profileId), eq(favorites.bookId, bookId)))
      .limit(1);

    let favorited = false;
    if (existing.length > 0) {
      await db.delete(favorites).where(eq(favorites.id, existing[0].id));
      await db
        .update(books)
        .set({ favoritesCount: sql`GREATEST(0, ${books.favoritesCount} - 1)` })
        .where(eq(books.id, bookId));
    } else {
      await db.insert(favorites).values({ profileId, bookId });
      await db
        .update(books)
        .set({ favoritesCount: sql`${books.favoritesCount} + 1` })
        .where(eq(books.id, bookId));
      favorited = true;
    }

    res.json({ favorited });
  } catch (error) {
    console.error('Favorite toggle failed:', error);
    res.status(500).json({ error: 'Impossible de modifier les favoris.' });
  }
});

apiRouter.put('/books/:id/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const profileId = req.profile!.id;
    const currentChapterNumber = Math.max(1, Number(req.body?.currentChapterNumber || 1));
    const scrollPercent = Math.min(100, Math.max(0, Number(req.body?.scrollPercent || 0)));

    await db
      .insert(readingProgress)
      .values({
        profileId,
        bookId,
        currentChapterNumber,
        scrollPercent,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [readingProgress.profileId, readingProgress.bookId],
        set: {
          currentChapterNumber,
          scrollPercent,
          lastReadAt: new Date(),
        },
      });

    res.json({ ok: true });
  } catch (error) {
    console.error('Reading progress save failed:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer la progression.' });
  }
});

apiRouter.post('/books/:id/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const chapterNumber = Math.max(1, Number(req.body?.chapterNumber || 1));
    const note = String(req.body?.note || '').slice(0, 240);

    const [bm] = await db
      .insert(bookmarks)
      .values({
        profileId: req.profile!.id,
        bookId,
        chapterNumber,
        note,
      })
      .returning();

    res.status(201).json({ bookmark: bm });
  } catch (error) {
    console.error('Create bookmark failed:', error);
    res.status(500).json({ error: 'Impossible d’ajouter le signet.' });
  }
});

apiRouter.delete('/books/:id/bookmarks/:bookmarkId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.id, String(req.params.bookmarkId)),
          eq(bookmarks.profileId, req.profile!.id)
        )
      );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete bookmark failed:', error);
    res.status(500).json({ error: 'Impossible de supprimer le signet.' });
  }
});

apiRouter.post('/books/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const rating = Math.min(5, Math.max(1, Number(req.body?.rating || 5)));
    const comment = String(req.body?.comment || '').trim().slice(0, 1000);
    if (!comment) {
      return res.status(400).json({ error: 'Veuillez écrire un commentaire.' });
    }
    const [review] = await db
      .insert(reviews)
      .values({
        bookId,
        profileId: req.profile!.id,
        rating,
        comment,
      })
      .returning();

    res.status(201).json({ review });
  } catch (error) {
    console.error('Review failed:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer l’avis.' });
  }
});

apiRouter.post('/books/:id/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    const details = String(req.body?.details || '').trim();
    if (!reason) {
      return res.status(400).json({ error: 'Motif de signalement requis.' });
    }
    const [report] = await db
      .insert(reports)
      .values({
        bookId,
        reporterProfileId: req.profile!.id,
        reason,
        details,
      })
      .returning();

    res.status(201).json({ report });
  } catch (error) {
    console.error('Report failed:', error);
    res.status(500).json({ error: 'Impossible d’envoyer le signalement.' });
  }
});

// ==================== AI STUDIO ENDPOINTS (GEMINI) ====================

apiRouter.post('/ai/outline', requireAuth, async (req: AuthRequest, res) => {
  const profile = req.profile!;
  if (!checkAiRateLimit(profile.id)) {
    return res.status(429).json({ error: 'Trop de requêtes IA. Veuillez patienter quelques secondes.' });
  }

  const { bookId, idempotencyKey } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'Identifiant du livre requis.' });

  const bookRows = await db.select().from(books).where(eq(books.id, String(bookId))).limit(1);
  if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
  const book = bookRows[0];
  if (book.authorProfileId !== profile.id && profile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  let chargedAmount = 0;
  try {
    const charge = await chargeCreditsAtomic({
      profileId: profile.id,
      action: 'outline',
      description: `Génération du plan : ${book.title}`,
      idempotencyKey,
    });
    if (charge.duplicate) {
      return res.status(409).json({ error: 'Requête déjà traitée.' });
    }
    chargedAmount = charge.charged;

    const outline = await generateBookOutline({
      title: book.title,
      subtitle: book.subtitle,
      subject: book.subject || book.title,
      description: book.description || book.title,
      languageCode: book.languageCode,
      categorySlug: book.categorySlug,
      targetAudience: book.targetAudience,
      writingStyle: book.writingStyle,
      targetChapters: book.targetChapters,
      targetLength: book.targetLength,
    });

    // Persist generated chapters into book_chapters
    await db.delete(bookChapters).where(eq(bookChapters.bookId, book.id));

    const insertedChapters = [];
    for (let i = 0; i < outline.chapters.length; i++) {
      const ch = outline.chapters[i];
      const summaryText = `${ch.summary}\n${ch.sections.map((s) => `• ${s}`).join('\n')}`.trim();
      const [savedCh] = await db
        .insert(bookChapters)
        .values({
          bookId: book.id,
          chapterNumber: i + 1,
          title: ch.title,
          summary: summaryText,
          contentHtml: '',
          wordCount: 0,
          status: 'outline',
          sortOrder: i + 1,
        })
        .returning();
      insertedChapters.push(savedCh);
    }

    await db
      .update(books)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(books.id, book.id));

    const models = await getConfiguredModels();
    await db.insert(aiGenerations).values({
      profileId: profile.id,
      bookId: book.id,
      model: models.textModel,
      action: 'outline',
      promptSummary: book.title,
      creditsCharged: chargedAmount,
      status: 'completed',
    });

    res.json({
      outline,
      chapters: insertedChapters,
      newBalance: charge.newBalance,
      creditsCharged: chargedAmount,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur Gemini';
    if (errMsg === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ error: 'Crédits IA insuffisants pour générer le plan.' });
    }
    await refundCreditsAtomic({
      profileId: profile.id,
      amount: chargedAmount,
      action: 'outline',
      description: 'Remboursement suite à une erreur de génération',
    });
    console.error('AI outline failed:', error);
    res.status(500).json({ error: `Échec de la génération du plan : ${errMsg}` });
  }
});

apiRouter.post('/ai/chapter', requireAuth, async (req: AuthRequest, res) => {
  const profile = req.profile!;
  if (!checkAiRateLimit(profile.id)) {
    return res.status(429).json({ error: 'Trop de requêtes IA. Veuillez patienter.' });
  }

  const { bookId, chapterId, idempotencyKey } = req.body || {};
  if (!bookId || !chapterId) return res.status(400).json({ error: 'bookId et chapterId requis.' });

  const [bookRows, chapterRows] = await Promise.all([
    db.select().from(books).where(eq(books.id, String(bookId))).limit(1),
    db
      .select()
      .from(bookChapters)
      .where(and(eq(bookChapters.id, String(chapterId)), eq(bookChapters.bookId, String(bookId))))
      .limit(1),
  ]);

  if (bookRows.length === 0 || chapterRows.length === 0) {
    return res.status(404).json({ error: 'Livre ou chapitre introuvable.' });
  }
  const book = bookRows[0];
  const chapter = chapterRows[0];
  if (book.authorProfileId !== profile.id && profile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  let chargedAmount = 0;
  try {
    const charge = await chargeCreditsAtomic({
      profileId: profile.id,
      action: 'chapter_draft',
      description: `Rédaction Chapitre ${chapter.chapterNumber} : ${chapter.title}`,
      idempotencyKey,
    });
    if (charge.duplicate) return res.status(409).json({ error: 'Requête déjà traitée.' });
    chargedAmount = charge.charged;

    const html = await generateChapterDraft({
      bookTitle: book.title,
      subject: book.subject || book.title,
      languageCode: book.languageCode,
      writingStyle: book.writingStyle,
      targetAudience: book.targetAudience,
      targetLength: book.targetLength,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      sections: chapter.summary
        .split('\n')
        .filter((l) => l.trim().startsWith('•'))
        .map((l) => l.replace(/^•\s*/, '')),
    });

    const wc = countWordsInHtml(html);
    const [updatedChapter] = await db
      .update(bookChapters)
      .set({
        contentHtml: html,
        wordCount: wc,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(bookChapters.id, chapter.id))
      .returning();

    const totalWords = await recalculateBookWordCount(book.id);

    const models = await getConfiguredModels();
    await db.insert(aiGenerations).values({
      profileId: profile.id,
      bookId: book.id,
      model: models.textModel,
      action: 'chapter_draft',
      promptSummary: chapter.title,
      creditsCharged: chargedAmount,
      status: 'completed',
    });

    res.json({
      chapter: updatedChapter,
      bookWordCount: totalWords,
      newBalance: charge.newBalance,
      creditsCharged: chargedAmount,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur Gemini';
    if (errMsg === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ error: 'Crédits IA insuffisants.' });
    }
    await refundCreditsAtomic({
      profileId: profile.id,
      amount: chargedAmount,
      action: 'chapter_draft',
      description: 'Remboursement suite à une erreur de rédaction IA',
    });
    console.error('AI chapter generation failed:', error);
    res.status(500).json({ error: `Échec de la rédaction : ${errMsg}` });
  }
});

apiRouter.post('/ai/text-tool', requireAuth, async (req: AuthRequest, res) => {
  const profile = req.profile!;
  if (!checkAiRateLimit(profile.id)) {
    return res.status(429).json({ error: 'Trop de requêtes IA.' });
  }

  const { action, text, languageCode, targetLanguage, tone, bookId, contextTitle, idempotencyKey } =
    req.body || {};

  if (!action || !text) {
    return res.status(400).json({ error: 'Action et texte source requis.' });
  }

  let chargedAmount = 0;
  try {
    const charge = await chargeCreditsAtomic({
      profileId: profile.id,
      action: String(action),
      description: `Outil rédaction IA : ${action}`,
      idempotencyKey,
    });
    if (charge.duplicate) return res.status(409).json({ error: 'Requête déjà traitée.' });
    chargedAmount = charge.charged;

    const resultHtml = await runAiTextTool({
      action,
      text: String(text),
      languageCode: String(languageCode || 'fr'),
      targetLanguage,
      tone,
      contextTitle,
    });

    const models = await getConfiguredModels();
    await db.insert(aiGenerations).values({
      profileId: profile.id,
      bookId: bookId || null,
      model: models.textModel,
      action: String(action),
      promptSummary: String(text).slice(0, 120),
      creditsCharged: chargedAmount,
      status: 'completed',
    });

    res.json({
      resultHtml,
      newBalance: charge.newBalance,
      creditsCharged: chargedAmount,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur Gemini';
    if (errMsg === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ error: 'Crédits IA insuffisants.' });
    }
    await refundCreditsAtomic({
      profileId: profile.id,
      amount: chargedAmount,
      action: String(action),
      description: 'Remboursement outil IA',
    });
    console.error('AI text tool failed:', error);
    res.status(500).json({ error: `Erreur IA : ${errMsg}` });
  }
});

apiRouter.post('/ai/proofread', requireAuth, async (req: AuthRequest, res) => {
  const profile = req.profile!;
  if (!checkAiRateLimit(profile.id)) {
    return res.status(429).json({ error: 'Trop de requêtes IA.' });
  }

  const { bookId, idempotencyKey } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId requis.' });

  const bookRows = await db.select().from(books).where(eq(books.id, String(bookId))).limit(1);
  if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
  const book = bookRows[0];
  if (book.authorProfileId !== profile.id && profile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  const chapters = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, book.id))
    .orderBy(bookChapters.sortOrder);

  if (chapters.length === 0) {
    return res.status(400).json({ error: 'Ajoutez au moins un chapitre avant de lancer la relecture.' });
  }

  let chargedAmount = 0;
  try {
    const charge = await chargeCreditsAtomic({
      profileId: profile.id,
      action: 'proofread',
      description: `Relecture éditoriale : ${book.title}`,
      idempotencyKey,
    });
    if (charge.duplicate) return res.status(409).json({ error: 'Requête déjà traitée.' });
    chargedAmount = charge.charged;

    const report = await proofreadManuscript({
      bookTitle: book.title,
      languageCode: book.languageCode,
      chapters: chapters.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        contentText: c.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || c.summary,
      })),
    });

    const models = await getConfiguredModels();
    await db.insert(aiGenerations).values({
      profileId: profile.id,
      bookId: book.id,
      model: models.textModel,
      action: 'proofread',
      promptSummary: book.title,
      creditsCharged: chargedAmount,
      status: 'completed',
    });

    res.json({
      report,
      newBalance: charge.newBalance,
      creditsCharged: chargedAmount,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur Gemini';
    if (errMsg === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ error: 'Crédits IA insuffisants.' });
    }
    await refundCreditsAtomic({
      profileId: profile.id,
      amount: chargedAmount,
      action: 'proofread',
      description: 'Remboursement relecture IA',
    });
    console.error('AI proofread failed:', error);
    res.status(500).json({ error: `Échec de la relecture : ${errMsg}` });
  }
});

apiRouter.post('/ai/image', requireAuth, async (req: AuthRequest, res) => {
  const profile = req.profile!;
  if (!checkAiRateLimit(profile.id)) {
    return res.status(429).json({ error: 'Trop de requêtes IA.' });
  }

  const planDef = PLAN_CATALOG[(profile.plan as PlanId) || 'free'] || PLAN_CATALOG.free;
  if (!planDef.allowAiIllustrations && profile.role !== 'admin') {
    return res.status(403).json({
      error: `La génération d’illustrations IA est incluse à partir de l’offre Auteur Pro (votre offre actuelle : ${planDef.name}).`,
    });
  }

  const { bookId, chapterId, prompt, style, kind, aspectRatio, idempotencyKey } = req.body || {};
  if (!bookId || !prompt) {
    return res.status(400).json({ error: 'bookId et prompt sont requis.' });
  }

  const bookRows = await db.select().from(books).where(eq(books.id, String(bookId))).limit(1);
  if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
  if (bookRows[0].authorProfileId !== profile.id && profile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  let chargedAmount = 0;
  try {
    const charge = await chargeCreditsAtomic({
      profileId: profile.id,
      action: 'generate_image',
      description: `Illustration IA (${style || 'editorial'})`,
      idempotencyKey,
    });
    if (charge.duplicate) return res.status(409).json({ error: 'Requête déjà traitée.' });
    chargedAmount = charge.charged;

    const generated = await generateBookIllustration({
      prompt: String(prompt),
      style: String(style || 'editorial'),
      aspectRatio: aspectRatio || (kind === 'cover' ? '3:4' : '4:3'),
    });

    const [savedImage] = await db
      .insert(bookImages)
      .values({
        bookId: String(bookId),
        chapterId: chapterId || null,
        profileId: profile.id,
        prompt: String(prompt),
        style: String(style || 'editorial'),
        kind: String(kind || 'illustration'),
        imageUrl: generated.imageUrl,
      })
      .returning();

    await db.insert(aiGenerations).values({
      profileId: profile.id,
      bookId: String(bookId),
      model: generated.model,
      action: 'generate_image',
      promptSummary: String(prompt).slice(0, 120),
      creditsCharged: chargedAmount,
      status: 'completed',
    });

    res.status(201).json({
      image: savedImage,
      newBalance: charge.newBalance,
      creditsCharged: chargedAmount,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur génération image';
    if (errMsg === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ error: 'Crédits IA insuffisants.' });
    }
    await refundCreditsAtomic({
      profileId: profile.id,
      amount: chargedAmount,
      action: 'generate_image',
      description: 'Remboursement génération image',
    });
    console.error('AI image failed:', error);
    res.status(500).json({
      error: `La génération d’image Gemini a échoué (${errMsg}). Vérifiez qu’une clé API Gemini facturée est sélectionnée dans Settings > Secrets.`,
    });
  }
});

apiRouter.get('/my/images', requireAuth, async (req: AuthRequest, res) => {
  try {
    const images = await db
      .select()
      .from(bookImages)
      .where(eq(bookImages.profileId, req.profile!.id))
      .orderBy(desc(bookImages.createdAt))
      .limit(50);
    res.json({ images });
  } catch (error) {
    console.error('My images failed:', error);
    res.status(500).json({ error: 'Impossible de charger vos illustrations.' });
  }
});

// ==================== REAL EXPORT CENTER ====================

apiRouter.post('/books/:id/export', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = req.profile!;
    const bookId = String(req.params.id);
    const format = String(req.body?.format || 'pdf').toLowerCase() as 'pdf' | 'epub' | 'html' | 'docx';
    if (!['pdf', 'epub', 'html', 'docx'].includes(format)) {
      return res.status(400).json({ error: 'Format d’export non supporté.' });
    }

    const planDef = PLAN_CATALOG[(profile.plan as PlanId) || 'free'] || PLAN_CATALOG.free;
    if (!planDef.allowedExports.includes(format) && profile.role !== 'admin') {
      return res.status(403).json({
        error: `L’export ${format.toUpperCase()} nécessite l’offre Auteur Pro ou Business.`,
      });
    }

    const bookRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRows.length === 0) return res.status(404).json({ error: 'Livre introuvable.' });
    const book = bookRows[0];

    if (!book.isPublic && book.authorProfileId !== profile.id && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const chapters = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, book.id))
      .orderBy(bookChapters.sortOrder, bookChapters.chapterNumber);

    const payload = {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      authorName: book.authorName,
      description: book.description,
      languageCode: book.languageCode,
      coverImageUrl: book.coverImageUrl,
      coverConfig: book.coverConfig,
      layoutConfig: book.layoutConfig,
      chapters: chapters.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        summary: c.summary,
        contentHtml: c.contentHtml,
      })),
    };

    const slug = book.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'ebook';
    const fileName = `${slug}.${format}`;

    let buffer: Buffer;
    let contentType: string;

    if (format === 'pdf') {
      buffer = await generatePdfBuffer(payload);
      contentType = 'application/pdf';
    } else if (format === 'epub') {
      buffer = await generateEpubBuffer(payload);
      contentType = 'application/epub+zip';
    } else if (format === 'docx') {
      buffer = await generateDocxBuffer(payload);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      const html = await generateHtmlString(payload);
      buffer = Buffer.from(html, 'utf-8');
      contentType = 'text/html; charset=utf-8';
    }

    await db.insert(exportsTable).values({
      profileId: profile.id,
      bookId: book.id,
      format,
      fileName,
      fileSizeBytes: buffer.length,
      status: 'completed',
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du fichier d’export.' });
  }
});

apiRouter.get('/my/exports', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        id: exportsTable.id,
        bookId: exportsTable.bookId,
        format: exportsTable.format,
        fileName: exportsTable.fileName,
        fileSizeBytes: exportsTable.fileSizeBytes,
        status: exportsTable.status,
        createdAt: exportsTable.createdAt,
        bookTitle: books.title,
      })
      .from(exportsTable)
      .innerJoin(books, eq(exportsTable.bookId, books.id))
      .where(eq(exportsTable.profileId, req.profile!.id))
      .orderBy(desc(exportsTable.createdAt))
      .limit(50);

    res.json({ exports: rows });
  } catch (error) {
    console.error('My exports failed:', error);
    res.status(500).json({ error: 'Impossible de charger l’historique des exports.' });
  }
});

// ==================== ACCOUNT, SETTINGS & BILLING ====================

apiRouter.patch('/my/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, preferredLocale } = req.body || {};
    const updates: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    if (fullName !== undefined && String(fullName).trim()) {
      updates.fullName = String(fullName).trim().slice(0, 100);
    }
    if (preferredLocale !== undefined) {
      updates.preferredLocale = String(preferredLocale).slice(0, 5);
    }
    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, req.profile!.id))
      .returning();

    res.json({ profile: updated });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
  }
});

apiRouter.get('/my/billing', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profileId = req.profile!.id;
    const [balance, subRows, creditTxs, paymentTxs, generationHistory] = await Promise.all([
      getCreditBalance(profileId),
      db.select().from(subscriptions).where(eq(subscriptions.profileId, profileId)).limit(1),
      db
        .select()
        .from(aiCreditTransactions)
        .where(eq(aiCreditTransactions.profileId, profileId))
        .orderBy(desc(aiCreditTransactions.createdAt))
        .limit(40),
      db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.profileId, profileId))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(20),
      db
        .select()
        .from(aiGenerations)
        .where(eq(aiGenerations.profileId, profileId))
        .orderBy(desc(aiGenerations.createdAt))
        .limit(25),
    ]);

    res.json({
      balance,
      subscription: subRows[0] ?? null,
      creditTransactions: creditTxs,
      paymentTransactions: paymentTxs,
      aiGenerations: generationHistory,
      paymentGatewayConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  } catch (error) {
    console.error('Billing fetch failed:', error);
    res.status(500).json({ error: 'Impossible de charger les données de facturation.' });
  }
});

apiRouter.post('/my/billing/subscribe', requireAuth, async (req: AuthRequest, res) => {
  const { plan } = req.body || {};
  if (!['free', 'pro', 'business'].includes(String(plan))) {
    return res.status(400).json({ error: 'Formule invalide.' });
  }

  // Never simulate fake paid transactions without configured payment gateway
  if (plan !== 'free' && !process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({
      configured: false,
      error:
        'Le module de paiement (STRIPE_SECRET_KEY) n’est pas encore configuré sur ce serveur. Aucun paiement factice n’est effectué. Un administrateur peut toutefois attribuer un abonnement depuis le Panneau Administrateur.',
    });
  }

  try {
    const profileId = req.profile!.id;
    const planDef = PLAN_CATALOG[plan as PlanId];
    await db
      .update(profiles)
      .set({ plan: planDef.id, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));

    await db
      .insert(subscriptions)
      .values({
        profileId,
        plan: planDef.id,
        status: 'active',
        billingCycle: 'monthly',
        provider: plan === 'free' ? 'default' : 'stripe',
      })
      .onConflictDoUpdate({
        target: subscriptions.profileId,
        set: { plan: planDef.id, status: 'active', updatedAt: new Date() },
      });

    res.json({ ok: true, plan: planDef.id });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour l’abonnement.' });
  }
});

// ==================== ADMIN PANEL ROUTES (STRICT RBAC) ====================

apiRouter.get('/admin/overview', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const [
      usersCount,
      booksCount,
      publicBooksCount,
      exportsCount,
      aiCount,
      openReportsCount,
      recentLogs,
      allCategories,
      allLanguages,
      allTemplates,
      aiCosts,
      aiModels,
      siteRows,
    ] = await Promise.all([
      db.select({ total: count() }).from(profiles),
      db.select({ total: count() }).from(books),
      db.select({ total: count() }).from(books).where(eq(books.isPublic, true)),
      db.select({ total: count() }).from(exportsTable),
      db.select({ total: count() }).from(aiGenerations),
      db.select({ total: count() }).from(reports).where(eq(reports.status, 'open')),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(25),
      db.select().from(bookCategories).orderBy(bookCategories.sortOrder),
      db.select().from(bookLanguages),
      db.select().from(bookTemplates).orderBy(bookTemplates.createdAt),
      getAiCosts(),
      getConfiguredModels(),
      db.select().from(platformSettings).where(eq(platformSettings.key, 'site_config')).limit(1),
    ]);

    res.json({
      stats: {
        users: Number(usersCount[0]?.total ?? 0),
        books: Number(booksCount[0]?.total ?? 0),
        publicBooks: Number(publicBooksCount[0]?.total ?? 0),
        exports: Number(exportsCount[0]?.total ?? 0),
        aiGenerations: Number(aiCount[0]?.total ?? 0),
        openReports: Number(openReportsCount[0]?.total ?? 0),
      },
      auditLogs: recentLogs,
      categories: allCategories,
      languages: allLanguages,
      templates: allTemplates,
      aiCosts,
      aiModels,
      siteConfig: siteRows[0]?.value ?? {},
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Impossible de charger les statistiques administrateur.' });
  }
});

apiRouter.get('/admin/users', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        profile: profiles,
        creditBalance: aiCreditBalances.balance,
      })
      .from(profiles)
      .leftJoin(aiCreditBalances, eq(profiles.id, aiCreditBalances.profileId))
      .orderBy(desc(profiles.createdAt));

    res.json({
      users: rows.map((r) => ({ ...r.profile, creditBalance: r.creditBalance ?? 0 })),
    });
  } catch (error) {
    console.error('Admin users failed:', error);
    res.status(500).json({ error: 'Erreur chargement utilisateurs.' });
  }
});

apiRouter.patch('/admin/users/:profileId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const targetId = String(req.params.profileId);
    const { role, plan, isActive, grantCredits } = req.body || {};

    const updates: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    if (role && ['user', 'admin'].includes(role)) updates.role = role;
    if (plan && ['free', 'pro', 'business'].includes(plan)) updates.plan = plan;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db.update(profiles).set(updates).where(eq(profiles.id, targetId)).returning();
    if (!updated) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (plan && ['free', 'pro', 'business'].includes(plan)) {
      await db
        .insert(subscriptions)
        .values({
          profileId: targetId,
          plan,
          status: 'active',
          provider: 'admin_grant',
        })
        .onConflictDoUpdate({
          target: subscriptions.profileId,
          set: { plan, status: 'active', provider: 'admin_grant', updatedAt: new Date() },
        });
    }

    const creditDelta = Number(grantCredits || 0);
    if (creditDelta !== 0) {
      await db
        .update(aiCreditBalances)
        .set({
          balance: sql`GREATEST(0, ${aiCreditBalances.balance} + ${creditDelta})`,
          updatedAt: new Date(),
        })
        .where(eq(aiCreditBalances.profileId, targetId));

      await db.insert(aiCreditTransactions).values({
        profileId: targetId,
        amount: creditDelta,
        type: 'grant',
        action: 'admin_adjustment',
        description: `Ajustement administrateur (${creditDelta > 0 ? '+' : ''}${creditDelta} crédits)`,
      });
    }

    await logAudit(req.profile!.id, 'admin_user_updated', 'profile', targetId, {
      role,
      plan,
      isActive,
      grantCredits: creditDelta,
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Admin update user failed:', error);
    res.status(500).json({ error: 'Impossible de modifier l’utilisateur.' });
  }
});

apiRouter.get('/admin/books', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(books).orderBy(desc(books.updatedAt)).limit(200);
    res.json({ books: rows });
  } catch (error) {
    console.error('Admin books failed:', error);
    res.status(500).json({ error: 'Impossible de charger les livres.' });
  }
});

apiRouter.patch('/admin/books/:bookId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.bookId);
    const { isPublic, isFeatured, status, title, categorySlug } = req.body || {};
    const updates: Partial<typeof books.$inferInsert> = { updatedAt: new Date() };
    if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (status !== undefined) updates.status = String(status);
    if (title !== undefined) updates.title = String(title);
    if (categorySlug !== undefined) updates.categorySlug = String(categorySlug);

    const [updated] = await db.update(books).set(updates).where(eq(books.id, bookId)).returning();
    if (!updated) return res.status(404).json({ error: 'Livre introuvable.' });

    await logAudit(req.profile!.id, 'admin_book_moderated', 'book', bookId, updates);
    res.json({ book: updated });
  } catch (error) {
    console.error('Admin moderate book failed:', error);
    res.status(500).json({ error: 'Impossible de modifier le livre.' });
  }
});

apiRouter.delete('/admin/books/:bookId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const bookId = String(req.params.bookId);
    await db.delete(books).where(eq(books.id, bookId));
    await logAudit(req.profile!.id, 'admin_book_deleted', 'book', bookId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin delete book failed:', error);
    res.status(500).json({ error: 'Impossible de supprimer le livre.' });
  }
});

apiRouter.post('/admin/categories', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { slug, name, description } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: 'Slug et nom requis.' });
    const [cat] = await db
      .insert(bookCategories)
      .values({ slug: String(slug).toLowerCase(), name: String(name), description: String(description || '') })
      .returning();
    await logAudit(req.profile!.id, 'admin_category_created', 'category', cat.id);
    res.status(201).json({ category: cat });
  } catch (error) {
    console.error('Admin create category failed:', error);
    res.status(500).json({ error: 'Impossible de créer la catégorie.' });
  }
});

apiRouter.delete('/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await db.delete(bookCategories).where(eq(bookCategories.id, String(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Impossible de supprimer la catégorie.' });
  }
});

apiRouter.patch('/admin/languages/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { isActive } = req.body || {};
    const [lang] = await db
      .update(bookLanguages)
      .set({ isActive: Boolean(isActive) })
      .where(eq(bookLanguages.id, String(req.params.id)))
      .returning();
    res.json({ language: lang });
  } catch {
    res.status(500).json({ error: 'Impossible de mettre à jour la langue.' });
  }
});

apiRouter.get('/admin/reports', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        report: reports,
        bookTitle: books.title,
        reporterEmail: profiles.email,
      })
      .from(reports)
      .innerJoin(books, eq(reports.bookId, books.id))
      .innerJoin(profiles, eq(reports.reporterProfileId, profiles.id))
      .orderBy(desc(reports.createdAt));
    res.json({ reports: rows });
  } catch {
    res.status(500).json({ error: 'Impossible de charger les signalements.' });
  }
});

apiRouter.patch('/admin/reports/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body || {};
    const [updated] = await db
      .update(reports)
      .set({ status: String(status || 'resolved') })
      .where(eq(reports.id, String(req.params.id)))
      .returning();
    await logAudit(req.profile!.id, 'admin_report_updated', 'report', String(req.params.id), { status });
    res.json({ report: updated });
  } catch {
    res.status(500).json({ error: 'Impossible de mettre à jour le signalement.' });
  }
});

apiRouter.put('/admin/settings', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { aiCosts, aiModels, siteConfig } = req.body || {};

    if (aiCosts) {
      await db
        .insert(platformSettings)
        .values({ key: 'ai_costs', value: aiCosts, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: aiCosts, updatedAt: new Date() },
        });
    }
    if (aiModels) {
      await db
        .insert(platformSettings)
        .values({ key: 'ai_models', value: aiModels, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: aiModels, updatedAt: new Date() },
        });
    }
    if (siteConfig) {
      await db
        .insert(platformSettings)
        .values({ key: 'site_config', value: siteConfig, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: siteConfig, updatedAt: new Date() },
        });
    }

    await logAudit(req.profile!.id, 'admin_settings_updated', 'platform_settings', 'global');
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin settings failed:', error);
    res.status(500).json({ error: 'Impossible de sauvegarder les paramètres.' });
  }
});
