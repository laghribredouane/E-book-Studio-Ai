import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  aiCreditBalances,
  bookCategories,
  bookChapters,
  bookLanguages,
  books,
  bookTemplates,
  platformSettings,
  profiles,
} from './schema.ts';
import { DEFAULT_AI_COSTS } from '../services/credits.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error('Database seed warning:', err);
    });
  }
  return seedPromise;
}

async function runSeed() {
  const existingCats = await db.select({ total: count() }).from(bookCategories);
  if ((existingCats[0]?.total ?? 0) === 0) {
    await db
      .insert(bookCategories)
      .values([
        { slug: 'technology', name: 'Technologie & IA', description: 'Ingénierie, systèmes et informatique', sortOrder: 1 },
        { slug: 'architecture', name: 'Architecture & Design', description: 'Design urbain, espace et esthétique', sortOrder: 2 },
        { slug: 'science', name: 'Sciences & Nature', description: 'Botanique, physique et recherche', sortOrder: 3 },
        { slug: 'travel', name: 'Voyage & Culture', description: 'Guides éditoriaux et récits géographiques', sortOrder: 4 },
        { slug: 'business', name: 'Entreprise & Stratégie', description: 'Leadership, finance et organisation', sortOrder: 5 },
        { slug: 'literature', name: 'Littérature & Essais', description: 'Romans, nouvelles et essais contemporains', sortOrder: 6 },
        { slug: 'education', name: 'Éducation & Pédagogie', description: 'Manuels pratiques et guides d’apprentissage', sortOrder: 7 },
        { slug: 'wellness', name: 'Bien-être & Art de vivre', description: 'Santé, gastronomie et équilibre', sortOrder: 8 },
      ])
      .onConflictDoNothing();
  }

  const existingLangs = await db.select({ total: count() }).from(bookLanguages);
  if ((existingLangs[0]?.total ?? 0) === 0) {
    await db
      .insert(bookLanguages)
      .values([
        { code: 'fr', name: 'Français', nativeName: 'Français', isRtl: false, isActive: true },
        { code: 'en', name: 'Anglais', nativeName: 'English', isRtl: false, isActive: true },
        { code: 'ar', name: 'Arabe', nativeName: 'العربية', isRtl: true, isActive: true },
        { code: 'de', name: 'Allemand', nativeName: 'Deutsch', isRtl: false, isActive: true },
        { code: 'es', name: 'Espagnol', nativeName: 'Español', isRtl: false, isActive: true },
        { code: 'pt', name: 'Portugais', nativeName: 'Português', isRtl: false, isActive: true },
        { code: 'it', name: 'Italien', nativeName: 'Italiano', isRtl: false, isActive: true },
        { code: 'tr', name: 'Turc', nativeName: 'Türkçe', isRtl: false, isActive: true },
        { code: 'nl', name: 'Néerlandais', nativeName: 'Nederlands', isRtl: false, isActive: true },
        { code: 'zh', name: 'Chinois', nativeName: '中文', isRtl: false, isActive: true },
        { code: 'ja', name: 'Japonais', nativeName: '日本語', isRtl: false, isActive: true },
      ])
      .onConflictDoNothing();
  }

  const existingTemplates = await db.select({ total: count() }).from(bookTemplates);
  if ((existingTemplates[0]?.total ?? 0) === 0) {
    await db
      .insert(bookTemplates)
      .values([
        {
          slug: 'midnight-editorial',
          name: 'Édition Minuit Classique',
          description: 'Couverture bleu nuit sobre avec accents dorés et typographie sérif.',
          category: 'literature',
          isPremium: false,
          coverConfig: {
            templateId: 'midnight-editorial',
            backgroundColor: '#0F172A',
            accentColor: '#D97706',
            textColor: '#F8FAFC',
            fontFamily: 'serif',
            titleAlign: 'left',
            showSubtitle: true,
            showAuthor: true,
            badgeText: 'Collection Essais',
            overlayOpacity: 0.45,
          },
          layoutConfig: {
            pageFormat: 'A5',
            marginMm: 18,
            lineHeight: 1.65,
            fontFamily: 'serif',
            fontSizePt: 11,
            showHeader: true,
            showFooter: true,
            showPageNumbers: true,
            includeToc: true,
            includeCoverPage: true,
          },
        },
        {
          slug: 'swiss-modernist',
          name: 'Modernisme Suisse',
          description: 'Grille épurée blanc cassé, titres géométriques et marges généreuses.',
          category: 'design',
          isPremium: false,
          coverConfig: {
            templateId: 'swiss-modernist',
            backgroundColor: '#F8FAFC',
            accentColor: '#6D28D9',
            textColor: '#0F172A',
            fontFamily: 'display',
            titleAlign: 'left',
            showSubtitle: true,
            showAuthor: true,
            badgeText: 'Monographie',
            overlayOpacity: 0.15,
          },
          layoutConfig: {
            pageFormat: 'A4',
            marginMm: 22,
            lineHeight: 1.6,
            fontFamily: 'sans',
            fontSizePt: 10.5,
            showHeader: true,
            showFooter: true,
            showPageNumbers: true,
            includeToc: true,
            includeCoverPage: true,
          },
        },
        {
          slug: 'plum-executive',
          name: 'Rapport Stratégique Violet',
          description: 'Idéal pour livres blancs, guides professionnels et manuels B2B.',
          category: 'business',
          isPremium: true,
          coverConfig: {
            templateId: 'plum-executive',
            backgroundColor: '#1E1B4B',
            accentColor: '#F59E0B',
            textColor: '#FFFFFF',
            fontFamily: 'display',
            titleAlign: 'center',
            showSubtitle: true,
            showAuthor: true,
            badgeText: 'Édition Stratégique',
            overlayOpacity: 0.5,
          },
          layoutConfig: {
            pageFormat: 'Letter',
            marginMm: 20,
            lineHeight: 1.55,
            fontFamily: 'sans',
            fontSizePt: 11,
            showHeader: true,
            showFooter: true,
            showPageNumbers: true,
            includeToc: true,
            includeCoverPage: true,
          },
        },
        {
          slug: 'archival-botanical',
          name: 'Atlas & Sciences Naturelles',
          description: 'Mise en page documentaire avec cadres dorés et typographie classique.',
          category: 'science',
          isPremium: true,
          coverConfig: {
            templateId: 'archival-botanical',
            backgroundColor: '#111827',
            accentColor: '#EAB308',
            textColor: '#F9FAFB',
            fontFamily: 'serif',
            titleAlign: 'center',
            showSubtitle: true,
            showAuthor: true,
            badgeText: 'Atlas Illustré',
            overlayOpacity: 0.35,
          },
          layoutConfig: {
            pageFormat: 'A4',
            marginMm: 24,
            lineHeight: 1.7,
            fontFamily: 'serif',
            fontSizePt: 11,
            showHeader: true,
            showFooter: true,
            showPageNumbers: true,
            includeToc: true,
            includeCoverPage: true,
          },
        },
      ])
      .onConflictDoNothing();
  }

  await db
    .insert(platformSettings)
    .values([
      { key: 'ai_costs', value: DEFAULT_AI_COSTS },
      {
        key: 'ai_models',
        value: { textModel: 'gemini-4-hydrogen', imageModel: 'gemini-3.1-flash-lite-image' },
      },
      {
        key: 'site_config',
        value: {
          platformName: 'EBOOK STUDIO AI',
          allowPublicRegistration: true,
          paymentIntegrationConfigured: false,
        },
      },
    ])
    .onConflictDoNothing();

  const existingBooks = await db.select({ total: count() }).from(books);
  if ((existingBooks[0]?.total ?? 0) === 0) {
    const demoAuthorRows = await db
      .insert(profiles)
      .values({
        uid: 'system-editorial-curator',
        email: 'editorial@ebookstudio.ai',
        fullName: 'Éditions Studio (Démo)',
        role: 'user',
        plan: 'business',
        preferredLocale: 'fr',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: { fullName: 'Éditions Studio (Démo)' },
      })
      .returning();

    const curator = demoAuthorRows[0];
    await db
      .insert(aiCreditBalances)
      .values({ profileId: curator.id, balance: 5000, monthlyAllowance: 5000 })
      .onConflictDoNothing();

    const demoCatalog = [
      {
        title: 'Lumière & Béton : Architecture Silencieuse',
        subtitle: 'Principes de géométrie solaire et de matérialité durable',
        authorName: 'Claire Moreau (Démo)',
        subject: 'Architecture contemporaine et gestion de la lumière naturelle',
        description:
          'Une exploration documentaire de la façon dont les volumes bruts, les arcades en travertin et l’orientation solaire façonnent des espaces apaisants et durables.',
        languageCode: 'fr',
        categorySlug: 'architecture',
        targetAudience: 'Architectes, designers et passionnés d’urbanisme',
        writingStyle: 'Éditorial, analytique et contemplatif',
        coverImageUrl: '/src/assets/images/cover_architecture_light_1794562687378.jpg',
        coverConfig: {
          templateId: 'midnight-editorial',
          backgroundColor: '#0F172A',
          accentColor: '#D97706',
          textColor: '#FFFFFF',
          fontFamily: 'display' as const,
          titleAlign: 'left' as const,
          showSubtitle: true,
          showAuthor: true,
          badgeText: 'Édition Démo',
          overlayOpacity: 0.45,
        },
        layoutConfig: {
          pageFormat: 'A4' as const,
          marginMm: 22,
          lineHeight: 1.7,
          fontFamily: 'serif' as const,
          fontSizePt: 11,
          showHeader: true,
          showFooter: true,
          showPageNumbers: true,
          includeToc: true,
          includeCoverPage: true,
        },
        viewsCount: 1240,
        favoritesCount: 184,
        chapters: [
          {
            chapterNumber: 1,
            title: 'La géométrie de l’ombre portée',
            summary: 'Comment la course du soleil sculpte les façades minérales tout au long de la journée.',
            contentHtml: `<h2>Lire un bâtiment par ses ombres</h2>
<p>Avant même d’observer la texture d’un mur ou la finesse d’une menuiserie, notre regard perçoit le contraste entre la surface éclairée et la zone préservée du soleil. Dans l’architecture méditerranéenne comme dans le minimalisme contemporain, l’ombre n’est pas une absence de lumière : elle est un matériau constructif à part entière.</p>
<figure><img src="/src/assets/images/ebook_illus_sunlight_arch_1794564431145.jpg" alt="Arcades minérales baignées de lumière oblique" /><figcaption>Fig. 1.1 — Étude de lumière rasante sur travertin et ombre portée sous arcade.</figcaption></figure>
<blockquote>« Un mur sans ombre est une page blanche sans typographie ; c’est l’angle d’incidence qui lui donne sa syntaxe. »</blockquote>
<h3>Trois leviers de maîtrise solaire</h3>
<ul>
  <li><strong>L’épaisseur des tableaux</strong> : reculer le vitrage de quarante centimètres suffit à couper le rayonnement zénithal d’été tout en accueillant le soleil bas d’hiver.</li>
  <li><strong>La cadence des arcades</strong> : une colonnade régulière crée un rythme visuel qui guide le pas et tempère la chaleur thermique.</li>
  <li><strong>La porosité minérale</strong> : le travertin non poli diffuse la lumière rasante sans jamais éblouir.</li>
</ul>`,
          },
          {
            chapterNumber: 2,
            title: 'Matières brutes et pérennité',
            summary: 'Patine du temps, choix des granulats et sobriété constructive.',
            contentHtml: `<h2>Construire pour le siècle</h2>
<p>La durabilité d’un ouvrage ne réside pas uniquement dans sa performance énergétique mesurée le jour de sa livraison. Elle tient à sa capacité à vieillir avec dignité. Un enduit à la chaux ou un béton architectural bien formulé gagne en profondeur à mesure que les saisons passent.</p>
<p>En limitant le nombre de matériaux différents à trois essences principales — pierre, bois massif et acier brossé — l’espace gagne une cohérence silencieuse qui résiste aux modes passagères.</p>`,
          },
          {
            chapterNumber: 3,
            title: 'Habiter le silence spatial',
            summary: 'Acoustique douce, proportions et respiration des circulations.',
            contentHtml: `<h2>L’acoustique de la sérénité</h2>
<p>Un espace réussi se reconnaît aussi les yeux fermés. Les volumes généreux demandent un traitement acoustique discret : soubassements en bois rainuré, textiles lourds et plafonds absorbants intégrés permettent de préserver le calme même dans les lieux collectifs.</p>`,
          },
        ],
      },
      {
        title: 'Atlas Botanique des Fougères Alpines',
        subtitle: 'Herbier illustré des vallées d’altitude et sous-bois boréaux',
        authorName: 'Dr. Henrik Lindqvist (Démo)',
        subject: 'Botanique alpine et morphologie des ptéridophytes',
        description:
          'Un ouvrage scientifique et visuel consacré aux fougères d’altitude, à leurs stratégies de résilience face au gel et à leur rôle écologique dans les sols forestiers.',
        languageCode: 'fr',
        categorySlug: 'science',
        targetAudience: 'Botanistes, naturalistes et curieux de nature',
        writingStyle: 'Scientifique précis et poétique',
        coverImageUrl: '/src/assets/images/cover_botanical_atlas_1794562686971.jpg',
        coverConfig: {
          templateId: 'archival-botanical',
          backgroundColor: '#111827',
          accentColor: '#EAB308',
          textColor: '#F9FAFB',
          fontFamily: 'serif' as const,
          titleAlign: 'center' as const,
          showSubtitle: true,
          showAuthor: true,
          badgeText: 'Atlas Démo',
          overlayOpacity: 0.4,
        },
        layoutConfig: {
          pageFormat: 'A4' as const,
          marginMm: 22,
          lineHeight: 1.7,
          fontFamily: 'serif' as const,
          fontSizePt: 11,
          showHeader: true,
          showFooter: true,
          showPageNumbers: true,
          includeToc: true,
          includeCoverPage: true,
        },
        viewsCount: 980,
        favoritesCount: 152,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Survivre au-dessus de la limite des arbres',
            summary: 'Adaptations physiologiques des frondes face aux cycles de gel et de dégel.',
            contentHtml: `<h2>La stratégie du rhizome protégé</h2>
<p>Entre 1 800 et 2 600 mètres d’altitude, la saison végétative dure parfois moins de dix semaines. Les fougères alpines ont développé des rhizomes souterrains riches en amidon, capables de déclencher le déroulement des crosses dès la fonte de la dernière congère.</p>
<figure><img src="/src/assets/images/ebook_illus_alpine_fern_1794564431336.jpg" alt="Planche botanique de fougère alpine" /><figcaption>Planche I — Morphologie des frondes, crosses et rhizomes en milieu alpin.</figcaption></figure>
<p>Leur épiderme cireux limite l’évapotranspiration sous l’effet combiné du vent et du rayonnement ultraviolet intense.</p>`,
          },
          {
            chapterNumber: 2,
            title: 'Cartographie des sporanges',
            summary: 'Observation morphologique des sores et dispersion par les vents d’automne.',
            contentHtml: `<h2>Micro-architecture de la reproduction</h2>
<p>Sous la face inférieure des frondes fertiles, les sores s’alignent selon une géométrie d’une régularité remarquable. Chaque sporange fonctionne comme une catapulte mécanique déclenchée par la dessiccation de l’anneau cellulaire.</p>`,
          },
        ],
      },
      {
        title: 'Systems Thinking for Digital Craft',
        subtitle: 'Designing resilient software products that respect human attention',
        authorName: 'Marcus Vance (Demo)',
        subject: 'Product architecture, typography, and calm technology',
        description:
          'A practical handbook for product engineers and design leaders seeking to replace noisy SaaS interfaces with purposeful, fast, and enduring digital tools.',
        languageCode: 'en',
        categorySlug: 'technology',
        targetAudience: 'Software architects, designers, and founders',
        writingStyle: 'Clear, pragmatic, and editorial',
        coverImageUrl: '/src/assets/images/cover_quantum_minds_1794562688999.jpg',
        coverConfig: {
          templateId: 'swiss-modernist',
          backgroundColor: '#0F172A',
          accentColor: '#7C3AED',
          textColor: '#FFFFFF',
          fontFamily: 'display' as const,
          titleAlign: 'left' as const,
          showSubtitle: true,
          showAuthor: true,
          badgeText: 'Demo Monograph',
          overlayOpacity: 0.45,
        },
        layoutConfig: {
          pageFormat: 'A5' as const,
          marginMm: 18,
          lineHeight: 1.65,
          fontFamily: 'sans' as const,
          fontSizePt: 10.5,
          showHeader: true,
          showFooter: true,
          showPageNumbers: true,
          includeToc: true,
          includeCoverPage: true,
        },
        viewsCount: 1510,
        favoritesCount: 230,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Latency as a Design Material',
            summary: 'Why sub-100ms interactions transform user trust and creative flow.',
            contentHtml: `<h2>Speed creates confidence</h2>
<p>Every interface carries an invisible rhythmic contract with its reader. When a tool responds within a single perceptual beat, users stop thinking about the software and stay immersed in their manuscript or calculation.</p>
<figure><img src="/src/assets/images/ebook_illus_system_diagram_1794564431656.jpg" alt="Modular systems architecture diagram" /><figcaption>Figure 1.1 — Modular pipeline connecting creative intent, state durability, and instant preview.</figcaption></figure>
<blockquote>“Calm software never demands attention for its own machinery; it amplifies the craft of the person holding the keyboard.”</blockquote>`,
          },
          {
            chapterNumber: 2,
            title: 'Typography Over Chrome',
            summary: 'Replacing heavy borders and badges with deliberate hierarchy.',
            contentHtml: `<h2>The discipline of subtraction</h2>
<p>Most enterprise interfaces suffer from defensive boxing: every metric gets a card, every card gets a border, and every tag gets a colored capsule. Removing two-thirds of those enclosures immediately clarifies what actually matters on the screen.</p>`,
          },
        ],
      },
      {
        title: 'المدن المضيئة: رحلة في فن العمارة والضوء',
        subtitle: 'تأملات بصرية في التخطيط الحضري والفضاءات الثقافية المعاصرة',
        authorName: 'د. ليلى المنصوري (نموذج)',
        subject: 'العمارة الحديثة والهوية البصرية للمدن العربية والعالمية',
        description:
          'كتاب تحليلي يستكشف توازن الضوء والظل في العمارة المعاصرة، مع دعم كامل لتنسيق اللغة العربية من اليمين إلى اليسار.',
        languageCode: 'ar',
        categorySlug: 'travel',
        targetAudience: 'المهندسون والباحثون والقراء المهتمون بالفنون',
        writingStyle: 'أدبي تحليلي رصين',
        coverImageUrl: '/src/assets/images/cover_culinary_tokyo_1794562689258.jpg',
        coverConfig: {
          templateId: 'midnight-editorial',
          backgroundColor: '#0F172A',
          accentColor: '#F59E0B',
          textColor: '#FFFFFF',
          fontFamily: 'serif' as const,
          titleAlign: 'center' as const,
          showSubtitle: true,
          showAuthor: true,
          badgeText: 'إصدار تجريبي',
          overlayOpacity: 0.45,
        },
        layoutConfig: {
          pageFormat: 'A5' as const,
          marginMm: 20,
          lineHeight: 1.8,
          fontFamily: 'serif' as const,
          fontSizePt: 12,
          showHeader: true,
          showFooter: true,
          showPageNumbers: true,
          includeToc: true,
          includeCoverPage: true,
        },
        viewsCount: 845,
        favoritesCount: 118,
        chapters: [
          {
            chapterNumber: 1,
            title: 'مقدمة في شعرية الفضاء الحضري',
            summary: 'كيف تحكي الأزقة القديمة والواجهات الحديثة قصة المكان.',
            contentHtml: `<h2>المدينة بوصفها كتاباً مفتوحاً</h2>
<p>حين نتجول عند الغسق في الأحياء التاريخية، نكتشف أن الإضاءة الدافئة ليست مجرد وسيلة للرؤية، بل لغة صامتة تربط بين الحجر والذاكرة الإنسانية. إن تصميم الفضاءات العامة يتطلب احتراماً عميقاً لإيقاع المشي وتفاصيل الحياة اليومية.</p>
<figure><img src="/src/assets/images/ebook_illus_kyoto_courtyard_1794564433268.jpg" alt="فناء مضاء بالفوانيس عند الغسق" /><figcaption>لوحة ١ — تدرجات الإضاءة الدافئة في الفناء الحجري عند الغسق.</figcaption></figure>
<blockquote>«العمارة الحقيقية تبدأ حين يشعر العابر أن المكان صُمم لراحته وتأمله.»</blockquote>`,
          },
          {
            chapterNumber: 2,
            title: 'حوار المواد الطبيعية مع المناخ',
            summary: 'دروس مستفادة من الفناء الداخلي والتهوية الطبيعية.',
            contentHtml: `<h2>حكمة البناء المستدام</h2>
<p>تقدم العمارة التقليدية حلولاً ذكية لتلطيف المناخ دون استهلاك مفرط للطاقة، من خلال الفناء الداخلي والظلال المتدرجة وتوجيه الفتحات نحو الرياح السائدة.</p>`,
          },
        ],
      },
    ];

    for (const item of demoCatalog) {
      const totalWords = item.chapters.reduce((acc, ch) => {
        const plain = ch.contentHtml.replace(/<[^>]+>/g, ' ').trim();
        return acc + (plain ? plain.split(/\s+/).length : 0);
      }, 0);

      const insertedBooks = await db
        .insert(books)
        .values({
          authorProfileId: curator.id,
          title: item.title,
          subtitle: item.subtitle,
          authorName: item.authorName,
          subject: item.subject,
          description: item.description,
          languageCode: item.languageCode,
          categorySlug: item.categorySlug,
          targetAudience: item.targetAudience,
          writingStyle: item.writingStyle,
          targetChapters: item.chapters.length,
          targetLength: 'medium',
          status: 'published',
          isPublic: true,
          isFeatured: true,
          isDemo: true,
          coverImageUrl: item.coverImageUrl,
          coverConfig: item.coverConfig,
          layoutConfig: item.layoutConfig,
          wordCount: totalWords,
          viewsCount: item.viewsCount,
          favoritesCount: item.favoritesCount,
        })
        .returning();

      const createdBook = insertedBooks[0];
      for (const ch of item.chapters) {
        const words = ch.contentHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
        await db.insert(bookChapters).values({
          bookId: createdBook.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          summary: ch.summary,
          contentHtml: ch.contentHtml,
          wordCount: words,
          status: 'completed',
          sortOrder: ch.chapterNumber,
        });
      }
    }
  }
}
