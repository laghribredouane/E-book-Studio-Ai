import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI, Type, type Content, type GenerateContentResponse } from '@google/genai';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { platformSettings } from '../db/schema.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface AiModelConfig {
  textModel: string;
  imageModel: string;
}

const ALLOWED_TEXT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite',
]);

const ALLOWED_IMAGE_MODELS = new Set([
  'gemini-3.1-flash-lite-image',
  'gemini-nano-banana-2.1',
  'gemini-3-pro-image',
]);

export async function getConfiguredModels(): Promise<AiModelConfig> {
  try {
    const row = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'ai_models'))
      .limit(1);
    if (row.length > 0 && row[0].value) {
      const val = row[0].value as Partial<AiModelConfig>;
      return {
        textModel: val.textModel && ALLOWED_TEXT_MODELS.has(val.textModel) ? val.textModel : 'gemini-4-hydrogen',
        imageModel:
          val.imageModel && ALLOWED_IMAGE_MODELS.has(val.imageModel)
            ? val.imageModel
            : 'gemini-3.1-flash-lite-image',
      };
    }
  } catch (error) {
    console.error('Failed to read ai_models setting:', error);
  }
  return {
    textModel: 'gemini-4-hydrogen',
    imageModel: 'gemini-3.1-flash-lite-image',
  };
}

function assertGeminiConfigured() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY non configurée sur le serveur.');
  }
}

export async function generateBookOutline(params: {
  title: string;
  subtitle?: string;
  subject: string;
  description: string;
  languageCode: string;
  categorySlug: string;
  targetAudience: string;
  writingStyle: string;
  targetChapters: number;
  targetLength: string;
}) {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();

  const prompt = `Tu es un directeur éditorial expert en édition numérique.
Génère un plan structuré complet pour un eBook en langue "${params.languageCode}".
Titre initial : ${params.title}
Sous-titre : ${params.subtitle || 'Aucun'}
Sujet : ${params.subject}
Description : ${params.description}
Catégorie : ${params.categorySlug}
Public cible : ${params.targetAudience}
Style rédactionnel : ${params.writingStyle}
Nombre de chapitres souhaité : ${params.targetChapters}
Longueur visée : ${params.targetLength}

Rédige absolument tout (titre proposé, introduction, chapitres, sous-sections, conclusion) dans la langue "${params.languageCode}".`;

  const response = await ai.models.generateContent({
    model: textModel,
    contents: prompt,
    config: {
      systemInstruction:
        'Tu retournes uniquement un objet JSON valide conforme au schéma demandé, avec des titres éditoriaux soignés et concrets.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: { type: Type.STRING },
          suggestedSubtitle: { type: Type.STRING },
          introduction: { type: Type.STRING },
          conclusion: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                sections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['chapterNumber', 'title', 'summary', 'sections'],
            },
          },
        },
        required: ['suggestedTitle', 'suggestedSubtitle', 'introduction', 'conclusion', 'chapters'],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as {
    suggestedTitle: string;
    suggestedSubtitle: string;
    introduction: string;
    conclusion: string;
    chapters: Array<{
      chapterNumber: number;
      title: string;
      summary: string;
      sections: string[];
    }>;
  };
}

export async function generateChapterDraft(params: {
  bookTitle: string;
  subject: string;
  languageCode: string;
  writingStyle: string;
  targetAudience: string;
  targetLength: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterSummary: string;
  sections: string[];
}) {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();

  const targetWords = params.targetLength === 'long' ? '1100 à 1500' : params.targetLength === 'short' ? '450 à 650' : '750 à 1000';

  const prompt = `Rédige le chapitre complet numéro ${params.chapterNumber} du livre "${params.bookTitle}".
Langue impérative de rédaction : ${params.languageCode}
Sujet global : ${params.subject}
Public cible : ${params.targetAudience}
Style rédactionnel : ${params.writingStyle}
Titre du chapitre : ${params.chapterTitle}
Résumé du chapitre : ${params.chapterSummary}
Sous-sections à couvrir : ${params.sections.length > 0 ? params.sections.join(', ') : 'Structure libre et fluide'}

Consignes de format :
- Longueur cible : environ ${targetWords} mots.
- Retourne du HTML éditorial propre utilisant uniquement les balises <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>, <em>.
- Ne mets pas le titre principal H1 du chapitre (il est déjà géré par l'éditeur).
- Pas de blocs markdown \`\`\`html.`;

  const response = await ai.models.generateContent({
    model: textModel,
    contents: prompt,
    config: {
      systemInstruction:
        'Tu es un auteur et éditeur littéraire professionnel. Produis un contenu riche, nuancé, structuré et directement publiable en HTML propre sans balises markdown.',
    },
  });

  let html = (response.text ?? '').trim();
  html = html.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  return html;
}

export async function runAiTextTool(params: {
  action:
    | 'generate_paragraph'
    | 'continue'
    | 'rewrite'
    | 'expand'
    | 'summarize'
    | 'fix_grammar'
    | 'improve_style'
    | 'translate'
    | 'simplify'
    | 'change_tone';
  text: string;
  languageCode: string;
  targetLanguage?: string;
  tone?: string;
  contextTitle?: string;
}) {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();

  const instructionMap: Record<string, string> = {
    generate_paragraph: `Génère un nouveau paragraphe pertinent et bien rédigé dans la langue "${params.languageCode}" sur le thème ou à partir de l'amorce fournie.`,
    continue: `Continue naturellement ce texte dans le même style et la même langue ("${params.languageCode}"), en ajoutant 2 à 3 paragraphes cohérents.`,
    rewrite: `Réécris ce passage avec plus de clarté, d'élégance et d'impact éditorial en conservant le sens exact.`,
    expand: `Développe et enrichis ce passage avec des explications concrètes, des exemples et une transition fluide.`,
    summarize: `Résume l'essentiel de ce passage de façon concise et structurée.`,
    fix_grammar: `Corrige toutes les fautes d'orthographe, de grammaire, de typographie et de ponctuation sans altérer la voix de l'auteur.`,
    improve_style: `Améliore le rythme, le vocabulaire et la fluidité stylistique de ce passage pour un rendu d'édition professionnelle.`,
    translate: `Traduis fidèlement ce texte vers la langue "${params.targetLanguage || 'en'}" en respectant les nuances littéraires et le format HTML.`,
    simplify: `Simplifie ce passage pour le rendre accessible à un public plus large tout en conservant la précision des idées.`,
    change_tone: `Adapte le ton de ce passage vers un registre "${params.tone || 'académique et élégant'}".`,
  };

  const response = await ai.models.generateContent({
    model: textModel,
    contents: `Contexte du livre/chapitre : ${params.contextTitle || 'Chapitre'}
Action demandée : ${instructionMap[params.action] || instructionMap.rewrite}

Texte source :
${params.text}`,
    config: {
      systemInstruction:
        'Retourne uniquement le texte transformé en HTML propre (<p>, <h3>, <ul>, <li>, <blockquote>, <strong>, <em>) sans commentaire méta ni balises markdown.',
    },
  });

  let html = (response.text ?? '').trim();
  html = html.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  return html;
}

export async function proofreadManuscript(params: {
  bookTitle: string;
  languageCode: string;
  chapters: Array<{ chapterNumber: number; title: string; contentText: string }>;
}) {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();

  const condensed = params.chapters
    .map((c) => `=== Chapitre ${c.chapterNumber}: ${c.title} ===\n${c.contentText.slice(0, 3500)}`)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: textModel,
    contents: `Effectue une relecture éditoriale complète du manuscrit "${params.bookTitle}" (langue : ${params.languageCode}).
Identifie les fautes, répétitions, incohérences narratives ou structurelles, passages incomplets et opportunités d'amélioration stylistique.
Ne réécris pas le livre entier : produis un rapport structuré actionnable.

Manuscrit :
${condensed}`,
    config: {
      systemInstruction:
        'Tu es un correcteur-réviseur éditorial senior. Retourne uniquement un JSON conforme au schéma fourni.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          structureFeedback: { type: Type.STRING },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: { type: Type.INTEGER },
                category: {
                  type: Type.STRING,
                  description: 'grammar | repetition | coherence | incomplete | structure | style',
                },
                severity: {
                  type: Type.STRING,
                  description: 'low | medium | high',
                },
                excerpt: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['chapterNumber', 'category', 'severity', 'excerpt', 'suggestion', 'explanation'],
            },
          },
        },
        required: ['executiveSummary', 'structureFeedback', 'issues'],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as {
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
  };
}

export async function generateBookIllustration(params: {
  prompt: string;
  style: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
}) {
  assertGeminiConfigured();
  const { imageModel } = await getConfiguredModels();

  const styleDescriptions: Record<string, string> = {
    editorial: 'Refined editorial book illustration, gallery print aesthetic, balanced composition, no text',
    cover: 'Professional hardcover book cover artwork, evocative composition, refined lighting, no text or letters',
    educational: 'Clear educational diagram or explanatory editorial illustration, clean geometric precision, soft neutral background',
    artistic: 'Fine art painterly illustration with rich texture, expressive light and shadow, museum quality, no text',
    realistic: 'Photorealistic documentary editorial photography, 35mm lens depth of field, natural lighting, no text',
    '3d': 'Clean architectural 3D render, tactile matte materials, soft studio rim lighting, no text',
    cartoon: 'Tasteful hand-crafted modern vector & storybook illustration, warm expressive palette, clean linework, no text',
    minimalist: 'Minimalist Swiss graphic artwork, bold clean shapes, ample breathing room, archival paper texture, no text',
  };

  const fullPrompt = `${styleDescriptions[params.style] || styleDescriptions.editorial}. Subject: ${params.prompt}`;

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [{ text: fullPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: params.aspectRatio || '4:3',
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      return {
        imageUrl: `data:${mime};base64,${part.inlineData.data}`,
        model: imageModel,
      };
    }
  }

  throw new Error("Aucune image n'a été retournée par le fournisseur IA.");
}

export interface WriterChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamWriterAssistantChat(params: {
  message: string;
  history: WriterChatMessage[];
  bookContext: {
    title?: string;
    subtitle?: string;
    subject?: string;
    description?: string;
    languageCode?: string;
    categorySlug?: string;
    targetAudience?: string;
    writingStyle?: string;
    chaptersOutline?: Array<{ chapterNumber: number; title: string }>;
    activeChapterTitle?: string;
    activeChapterExcerpt?: string;
  };
}): AsyncGenerator<string, { model: string }, unknown> {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();

  const ctx = params.bookContext;
  const outlineSummary =
    ctx.chaptersOutline && ctx.chaptersOutline.length > 0
      ? ctx.chaptersOutline.map((c) => `  ${c.chapterNumber}. ${c.title}`).join('\n')
      : '  (Plan en cours de définition)';

  const systemInstruction = `Tu es "AI Writer Assistant", un éditeur littéraire et coach d'écriture senior intégré à EBOOK STUDIO AI.
Tu aides les auteurs en temps réel avec des conseils d'écriture concrets, le développement approfondi des personnages, la construction d'intrigues, le rythme narratif, la structure des chapitres et l'amélioration stylistique.

Contexte du projet de livre actuel :
- Titre : ${ctx.title || 'Sans titre'}
- Sous-titre : ${ctx.subtitle || 'Aucun'}
- Sujet : ${ctx.subject || 'Non précisé'}
- Description : ${ctx.description || 'Non précisée'}
- Catégorie : ${ctx.categorySlug || 'Général'}
- Langue du livre : ${ctx.languageCode || 'fr'}
- Public cible : ${ctx.targetAudience || 'Lecteurs généraux'}
- Style rédactionnel : ${ctx.writingStyle || 'Éditorial soigné'}
- Chapitres du livre :
${outlineSummary}
${
  ctx.activeChapterTitle
    ? `- Chapitre actuellement ouvert : ${ctx.activeChapterTitle}
- Extrait du chapitre actif :
${(ctx.activeChapterExcerpt || '').slice(0, 3000) || '(Chapitre encore vide)'}`
    : ''
}

Directives :
1. Réponds dans la langue du message de l'utilisateur (ou dans la langue du livre si ambigu).
2. Sois précis, créatif, structuré et directement actionnable par rapport au livre ci-dessus.
3. Si l'utilisateur demande des idées d'intrigue, de personnages ou de rédaction, propose des pistes concrètes prêtes à être intégrées au manuscrit.
4. Utilise une mise en forme claire (paragraphes courts, listes à puces, gras léger) sans blabla inutile.`;

  // Build valid alternating history starting with a 'user' turn as required by Gemini Chats API
  const validHistory: Content[] = [];
  for (const item of params.history.slice(-16)) {
    const text = item.content.trim();
    if (!text) continue;
    const role: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';
    if (validHistory.length === 0 && role !== 'user') continue;
    const last = validHistory[validHistory.length - 1];
    if (last && last.role === role) {
      last.parts = [{ text: `${last.parts?.[0]?.text || ''}\n\n${text}` }];
    } else {
      validHistory.push({ role, parts: [{ text }] });
    }
  }
  // Ensure history ends on 'model' before calling sendMessageStream with the new user turn
  if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
    validHistory.pop();
  }

  const chat = ai.chats.create({
    model: textModel,
    history: validHistory,
    config: {
      systemInstruction,
    },
  });

  const stream = await chat.sendMessageStream({ message: params.message });
  for await (const chunk of stream) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      yield c.text;
    }
  }

  return { model: textModel };
}

async function resolveInspirationImagePart(imageInput: string): Promise<{ mimeType: string; data: string }> {
  if (imageInput.startsWith('data:image/')) {
    const match = imageInput.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      throw new Error("Format d'image base64 invalide.");
    }
    return {
      mimeType: match[1],
      data: match[2].replace(/\s+/g, ''),
    };
  }

  if (imageInput.startsWith('/src/assets/images/')) {
    const assetsDir = path.resolve(process.cwd(), 'src/assets/images');
    const resolved = path.resolve(process.cwd(), imageInput.replace(/^\/+/, ''));
    if (!resolved.startsWith(assetsDir + path.sep)) {
      throw new Error("Chemin d'image non autorisé.");
    }
    const buf = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return {
      mimeType,
      data: buf.toString('base64'),
    };
  }

  throw new Error("Source d'image non supportée. Importez un fichier PNG, JPEG ou WebP.");
}

export async function generateEbookFromImage(params: {
  imageInput: string;
  userHint?: string;
  languageCode: string;
  targetChapters: number;
  targetLength: string;
  availableCategories: string[];
}) {
  assertGeminiConfigured();
  const { textModel } = await getConfiguredModels();
  const imagePart = await resolveInspirationImagePart(params.imageInput);

  const allowedCats = params.availableCategories.length > 0
    ? params.availableCategories.join(', ')
    : 'technology, architecture, science, travel, business, literature, education, wellness';

  const prompt = `Tu es un directeur éditorial visionnaire et auteur primé.
Observe attentivement cette image : son atmosphère, ses sujets, ses couleurs, sa composition, ses symboles et son histoire implicite.
À partir de cette inspiration visuelle${params.userHint ? ` et de l'orientation donnée par l'auteur ("${params.userHint}")` : ''}, conçois un projet complet d'eBook original en langue "${params.languageCode}".

Contraintes :
- Choisis "categorySlug" uniquement parmi : ${allowedCats}.
- Propose une palette de couleurs hexadécimales ("backgroundColor", "accentColor", "textColor") harmonisée avec l'image et offrant un contraste lisible pour la couverture.
- Génère exactement ${params.targetChapters} chapitres structurés (longueur visée : ${params.targetLength}).
- Rédige "chapterOneHtml" : un premier chapitre d'ouverture immersif (400 à 600 mots) utilisant uniquement les balises HTML <h2>, <h3>, <p>, <blockquote>, <strong>, <em> (sans H1 et sans markdown \`\`\`).
- Tout le contenu textuel (sauf les codes hex et categorySlug) doit être rédigé dans la langue "${params.languageCode}".`;

  const response = await ai.models.generateContent({
    model: textModel,
    contents: {
      parts: [
        { inlineData: imagePart },
        { text: prompt },
      ],
    },
    config: {
      systemInstruction:
        'Tu retournes uniquement un objet JSON valide conforme au schéma demandé, inspiré directement de l’image fournie.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visualAnalysis: {
            type: Type.STRING,
            description: 'Brève analyse éditoriale des éléments visuels, couleurs et ambiance perçus dans l’image.',
          },
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          subject: { type: Type.STRING },
          description: { type: Type.STRING },
          categorySlug: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          writingStyle: { type: Type.STRING },
          backgroundColor: { type: Type.STRING },
          accentColor: { type: Type.STRING },
          textColor: { type: Type.STRING },
          badgeText: { type: Type.STRING },
          introduction: { type: Type.STRING },
          conclusion: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                sections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['chapterNumber', 'title', 'summary', 'sections'],
            },
          },
          chapterOneHtml: { type: Type.STRING },
        },
        required: [
          'visualAnalysis',
          'title',
          'subtitle',
          'subject',
          'description',
          'categorySlug',
          'targetAudience',
          'writingStyle',
          'backgroundColor',
          'accentColor',
          'textColor',
          'badgeText',
          'introduction',
          'conclusion',
          'chapters',
          'chapterOneHtml',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    visualAnalysis: string;
    title: string;
    subtitle: string;
    subject: string;
    description: string;
    categorySlug: string;
    targetAudience: string;
    writingStyle: string;
    backgroundColor: string;
    accentColor: string;
    textColor: string;
    badgeText: string;
    introduction: string;
    conclusion: string;
    chapters: Array<{
      chapterNumber: number;
      title: string;
      summary: string;
      sections: string[];
    }>;
    chapterOneHtml: string;
  };

  return {
    ...parsed,
    model: textModel,
  };
}


