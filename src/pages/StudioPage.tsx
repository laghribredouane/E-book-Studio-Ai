import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Download,
  Eye,
  FileCheck2,
  Image as ImageIcon,
  Layout,
  ListTree,
  Palette,
  PenTool,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardShell } from '../components/DashboardShell';
import { BookCoverPreview } from '../components/BookCoverPreview';
import { AiWriterAssistantPanel } from '../components/AiWriterAssistantPanel';
import { STUDIO_COVER_ASSETS, STUDIO_ILLUSTRATION_ASSETS } from '../lib/studioAssets';
import type {
  Book,
  BookChapter,
  BookImage,
  CoverConfig,
  LayoutConfig,
  PdfStandard,
  ProofreadReport,
  StudioTab,
} from '../types';

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

export const StudioPage: React.FC<{
  initialBookId?: string;
  initialTab?: StudioTab;
  initialMode?: 'classic' | 'image';
}> = ({
  initialBookId,
  initialTab = 'setup',
  initialMode = 'classic',
}) => {
  const { apiFetch, bootstrap, navigate, notify, refreshBootstrap } = useApp();

  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | undefined>(initialBookId);
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [images, setImages] = useState<BookImage[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Setup Form State (for creating or editing project metadata)
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formAuthor, setFormAuthor] = useState(bootstrap?.user?.profile.fullName || '');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLang, setFormLang] = useState('fr');
  const [formCategory, setFormCategory] = useState('technology');
  const [formAudience, setFormAudience] = useState('Professionnels et lecteurs curieux');
  const [formStyle, setFormStyle] = useState('Clair, structuré et engageant');
  const [formChaptersCount, setFormChaptersCount] = useState(6);
  const [formLength, setFormLength] = useState('medium');

  // Image-Inspired eBook Generator State
  const [setupMode, setSetupMode] = useState<'classic' | 'image'>(initialMode);
  const [inspirationImage, setInspirationImage] = useState<string>('');
  const [inspirationImageLabel, setInspirationImageLabel] = useState<string>('');
  const [inspirationHint, setInspirationHint] = useState<string>('');
  const [visualAnalysisNote, setVisualAnalysisNote] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Editor State
  const editorRef = useRef<HTMLDivElement>(null);
  const [chapterTitleDraft, setChapterTitleDraft] = useState('');
  const [chapterHtmlDraft, setChapterHtmlDraft] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [aiToolAction, setAiToolAction] = useState<
    | 'generate_paragraph'
    | 'continue'
    | 'rewrite'
    | 'expand'
    | 'summarize'
    | 'fix_grammar'
    | 'improve_style'
    | 'translate'
    | 'simplify'
    | 'change_tone'
  >('continue');
  const [aiTargetLang, setAiTargetLang] = useState('en');
  const [aiTone, setAiTone] = useState('académique et élégant');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiPreviewHtml, setAiPreviewHtml] = useState<string | null>(null);
  const [aiWorking, setAiWorking] = useState(false);

  // Outline State
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [outlineMeta, setOutlineMeta] = useState<{ introduction?: string; conclusion?: string } | null>(
    null
  );

  // Illustrations State
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgStyle, setImgStyle] = useState('editorial');
  const [imgKind, setImgKind] = useState<'illustration' | 'cover' | 'chapter'>('chapter');
  const [imgAspect, setImgAspect] = useState<'4:3' | '3:4' | '1:1' | '16:9'>('4:3');
  const [showEditorImagePicker, setShowEditorImagePicker] = useState(false);
  const [showEditorLinkBar, setShowEditorLinkBar] = useState(false);
  const [editorLinkUrl, setEditorLinkUrl] = useState('');

  // Proofreading State
  const [proofReport, setProofReport] = useState<ProofreadReport | null>(null);
  const [dismissedIssues, setDismissedIssues] = useState<number[]>([]);

  // Export State
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [exportPdfStandard, setExportPdfStandard] = useState<PdfStandard>('standard');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialBookId) setActiveBookId(initialBookId);
  }, [initialBookId]);

  useEffect(() => {
    if (initialMode) {
      setSetupMode(initialMode);
      if (initialMode === 'image' && !initialBookId) {
        setActiveBookId(undefined);
        setActiveTab('setup');
      }
    }
  }, [initialBookId, initialMode]);

  // Load user's projects list
  const loadMyBooksList = useCallback(async () => {
    const res = await apiFetch('/api/my/books');
    if (res.ok) {
      const data = await res.json();
      const list = (data.books || []) as Book[];
      setMyBooks(list);
      if (!activeBookId && list.length > 0 && initialTab !== 'setup') {
        setActiveBookId(list[0].id);
      }
    }
  }, [activeBookId, apiFetch, initialTab]);

  useEffect(() => {
    void loadMyBooksList();
  }, [loadMyBooksList]);

  // Load active book details
  const loadBookDetails = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/books/${id}`);
        if (res.ok) {
          const data = await res.json();
          const b: Book = data.book;
          const chs: BookChapter[] = data.chapters || [];
          setBook(b);
          setChapters(chs);
          setImages(data.images || []);

          setFormTitle(b.title);
          setFormSubtitle(b.subtitle);
          setFormAuthor(b.authorName);
          setFormSubject(b.subject);
          setFormDescription(b.description);
          setFormLang(b.languageCode);
          setFormCategory(b.categorySlug);
          setFormAudience(b.targetAudience);
          setFormStyle(b.writingStyle);
          setFormChaptersCount(b.targetChapters);
          setFormLength(b.targetLength);

          if (chs.length > 0) {
            const target = chs.find((c) => c.id === activeChapterId) || chs[0];
            setActiveChapterId(target.id);
            setChapterTitleDraft(target.title);
            setChapterHtmlDraft(target.contentHtml);
          } else {
            setActiveChapterId(null);
            setChapterTitleDraft('');
            setChapterHtmlDraft('');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [activeChapterId, apiFetch]
  );

  useEffect(() => {
    if (activeBookId) {
      void loadBookDetails(activeBookId);
    } else {
      setBook(null);
      setChapters([]);
      setImages([]);
      if (bootstrap?.user?.profile.fullName && !formAuthor) {
        setFormAuthor(bootstrap.user.profile.fullName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookId]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) || null;

  // Sync contentEditable DOM when switching chapters
  useEffect(() => {
    if (editorRef.current && activeChapter) {
      if (editorRef.current.innerHTML !== chapterHtmlDraft) {
        editorRef.current.innerHTML = chapterHtmlDraft || '';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterId]);

  // Debounced autosave for active chapter
  useEffect(() => {
    if (!book || !activeChapter) return;
    if (
      chapterTitleDraft === activeChapter.title &&
      chapterHtmlDraft === activeChapter.contentHtml
    ) {
      return;
    }

    setSaveState('saving');
    const timer = setTimeout(async () => {
      const res = await apiFetch(`/api/books/${book.id}/chapters/${activeChapter.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: chapterTitleDraft,
          contentHtml: chapterHtmlDraft,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChapters((prev) => prev.map((c) => (c.id === data.chapter.id ? data.chapter : c)));
        setBook((prev) => (prev ? { ...prev, wordCount: data.bookWordCount } : prev));
        setSaveState('saved');
      } else {
        setSaveState('idle');
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [activeChapter, apiFetch, book, chapterHtmlDraft, chapterTitleDraft]);

  const handleInspirationFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('error', 'Veuillez sélectionner un fichier image (PNG, JPEG ou WebP).');
      return;
    }
    if (file.size > 12_000_000) {
      notify('error', 'Image trop volumineuse (max 12 Mo).');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });

      const resizedDataUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          const maxDim = 1400;
          if (img.width <= maxDim && img.height <= maxDim && dataUrl.length < 700_000) {
            resolve(dataUrl);
            return;
          }
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = dataUrl;
      });

      setInspirationImage(resizedDataUrl);
      setInspirationImageLabel(file.name);
    } catch {
      notify('error', 'Impossible de charger cette image.');
    } finally {
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };

  const handleCreateFromImage = async () => {
    if (!inspirationImage) {
      notify('error', 'Veuillez importer ou choisir une image d’inspiration.');
      return;
    }
    setAiWorking(true);
    try {
      const res = await apiFetch('/api/ai/ebook-from-image', {
        method: 'POST',
        body: JSON.stringify({
          imageInput: inspirationImage,
          userHint: inspirationHint.trim() || undefined,
          authorName: formAuthor.trim() || bootstrap?.user?.profile.fullName || 'Auteur',
          languageCode: formLang,
          targetChapters: Math.min(12, Math.max(3, Number(formChaptersCount || 6))),
          targetLength: formLength,
          idempotencyKey: `from_img_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Échec de la création depuis l’image.');
        return;
      }

      const createdBook = data.book as Book;
      const createdChapters = (data.chapters || []) as BookChapter[];

      setBook(createdBook);
      setActiveBookId(createdBook.id);
      setChapters(createdChapters);
      setFormTitle(createdBook.title);
      setFormSubtitle(createdBook.subtitle);
      setFormAuthor(createdBook.authorName);
      setFormSubject(createdBook.subject);
      setFormDescription(createdBook.description);
      setFormLang(createdBook.languageCode);
      setFormCategory(createdBook.categorySlug);
      setFormAudience(createdBook.targetAudience);
      setFormStyle(createdBook.writingStyle);
      setFormChaptersCount(createdBook.targetChapters);
      setFormLength(createdBook.targetLength);

      setOutlineMeta({
        introduction: data.introduction,
        conclusion: data.conclusion,
      });
      setVisualAnalysisNote(data.visualAnalysis || null);

      if (createdChapters.length > 0) {
        setActiveChapterId(createdChapters[0].id);
        setChapterTitleDraft(createdChapters[0].title);
        setChapterHtmlDraft(createdChapters[0].contentHtml);
      }

      await Promise.all([loadMyBooksList(), refreshBootstrap()]);
      setActiveTab('outline');
      notify(
        'success',
        `eBook « ${createdBook.title} » généré à partir de votre image (${data.creditsCharged} crédits).`
      );
    } finally {
      setAiWorking(false);
    }
  };

  const handleSaveProjectSetup = async (andGenerateOutline: boolean) => {
    if (!formTitle.trim()) {
      notify('error', 'Veuillez saisir un titre pour votre eBook.');
      return;
    }
    setAiWorking(true);
    try {
      let targetBookId = book?.id;

      if (!targetBookId) {
        const res = await apiFetch('/api/books', {
          method: 'POST',
          body: JSON.stringify({
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            authorName: formAuthor.trim() || bootstrap?.user?.profile.fullName || 'Auteur',
            subject: formSubject.trim(),
            description: formDescription.trim(),
            languageCode: formLang,
            categorySlug: formCategory,
            targetAudience: formAudience.trim(),
            writingStyle: formStyle.trim(),
            targetChapters: formChaptersCount,
            targetLength: formLength,
            coverConfig: DEFAULT_COVER,
            layoutConfig: DEFAULT_LAYOUT,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          notify('error', data.error || 'Impossible de créer le projet.');
          return;
        }
        targetBookId = data.book.id;
        setActiveBookId(targetBookId);
        await loadMyBooksList();
        notify('success', 'Projet créé et sauvegardé.');
      } else {
        const res = await apiFetch(`/api/books/${targetBookId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            authorName: formAuthor.trim(),
            subject: formSubject.trim(),
            description: formDescription.trim(),
            languageCode: formLang,
            categorySlug: formCategory,
            targetAudience: formAudience.trim(),
            writingStyle: formStyle.trim(),
            targetChapters: formChaptersCount,
            targetLength: formLength,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setBook(data.book);
          notify('success', 'Paramètres du projet enregistrés.');
        }
      }

      if (andGenerateOutline && targetBookId) {
        const outRes = await apiFetch('/api/ai/outline', {
          method: 'POST',
          body: JSON.stringify({
            bookId: targetBookId,
            idempotencyKey: `outline_${targetBookId}_${Date.now()}`,
          }),
        });
        const outData = await outRes.json();
        if (outRes.ok) {
          setChapters(outData.chapters || []);
          setOutlineMeta({
            introduction: outData.outline?.introduction,
            conclusion: outData.outline?.conclusion,
          });
          if (outData.chapters?.length > 0) {
            setActiveChapterId(outData.chapters[0].id);
            setChapterTitleDraft(outData.chapters[0].title);
            setChapterHtmlDraft(outData.chapters[0].contentHtml);
          }
          await refreshBootstrap();
          setActiveTab('outline');
          notify('success', 'Plan complet généré par Gemini.');
        } else {
          notify('error', outData.error || 'Échec de la génération du plan.');
        }
      } else {
        setActiveTab('outline');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!book) return;
    setAiWorking(true);
    try {
      const res = await apiFetch('/api/ai/outline', {
        method: 'POST',
        body: JSON.stringify({
          bookId: book.id,
          idempotencyKey: `outline_${book.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChapters(data.chapters || []);
        setOutlineMeta({
          introduction: data.outline?.introduction,
          conclusion: data.outline?.conclusion,
        });
        await refreshBootstrap();
        notify('success', `Plan généré (${data.creditsCharged} crédits utilisés).`);
      } else {
        notify('error', data.error || 'Impossible de générer le plan.');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const handleAddChapter = async () => {
    if (!book) return;
    const res = await apiFetch(`/api/books/${book.id}/chapters`, {
      method: 'POST',
      body: JSON.stringify({
        title: newChapterTitle.trim() || `Chapitre ${chapters.length + 1}`,
        summary: '',
        contentHtml: '<p></p>',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setChapters((prev) => [...prev, data.chapter]);
      setNewChapterTitle('');
      notify('success', 'Chapitre ajouté.');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!book) return;
    const res = await apiFetch(`/api/books/${book.id}/chapters/${chapterId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadBookDetails(book.id);
      notify('info', 'Chapitre supprimé.');
    }
  };

  const handleMoveChapter = async (index: number, direction: -1 | 1) => {
    if (!book) return;
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setChapters(next.map((c, idx) => ({ ...c, chapterNumber: idx + 1 })));

    await apiFetch(`/api/books/${book.id}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedChapterIds: next.map((c) => c.id) }),
    });
  };

  const handleGenerateFullChapter = async () => {
    if (!book || !activeChapter) return;
    setAiWorking(true);
    try {
      const res = await apiFetch('/api/ai/chapter', {
        method: 'POST',
        body: JSON.stringify({
          bookId: book.id,
          chapterId: activeChapter.id,
          idempotencyKey: `chapter_${activeChapter.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChapterHtmlDraft(data.chapter.contentHtml);
        if (editorRef.current) editorRef.current.innerHTML = data.chapter.contentHtml;
        setChapters((prev) => prev.map((c) => (c.id === data.chapter.id ? data.chapter : c)));
        setBook((prev) => (prev ? { ...prev, wordCount: data.bookWordCount } : prev));
        await refreshBootstrap();
        notify('success', `Chapitre rédigé par Gemini (${data.creditsCharged} crédits).`);
      } else {
        notify('error', data.error || 'Échec de la rédaction IA.');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const handleRunAiTool = async () => {
    if (!book || !activeChapter) return;
    const selectionText = window.getSelection()?.toString().trim();
    const sourceText =
      aiPromptInput.trim() ||
      selectionText ||
      chapterHtmlDraft.replace(/<[^>]+>/g, ' ').trim() ||
      activeChapter.title;

    setAiWorking(true);
    setAiPreviewHtml(null);
    try {
      const res = await apiFetch('/api/ai/text-tool', {
        method: 'POST',
        body: JSON.stringify({
          action: aiToolAction,
          text: sourceText,
          languageCode: book.languageCode,
          targetLanguage: aiTargetLang,
          tone: aiTone,
          bookId: book.id,
          contextTitle: `${book.title} — ${activeChapter.title}`,
          idempotencyKey: `tool_${activeChapter.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiPreviewHtml(data.resultHtml);
        await refreshBootstrap();
      } else {
        notify('error', data.error || 'Erreur outil IA.');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const applyAiPreview = (mode: 'append' | 'replace') => {
    if (!aiPreviewHtml) return;
    const nextHtml =
      mode === 'replace' ? aiPreviewHtml : `${chapterHtmlDraft || ''}\n${aiPreviewHtml}`;
    setChapterHtmlDraft(nextHtml);
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
    setAiPreviewHtml(null);
    notify('success', 'Contenu appliqué dans l’éditeur.');
  };

  const execEditorFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      setChapterHtmlDraft(editorRef.current.innerHTML);
    }
  };

  const insertHtmlSnippet = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) {
      setChapterHtmlDraft(editorRef.current.innerHTML);
    }
  };

  const handleGenerateIllustration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || !imgPrompt.trim()) return;
    setAiWorking(true);
    try {
      const res = await apiFetch('/api/ai/image', {
        method: 'POST',
        body: JSON.stringify({
          bookId: book.id,
          chapterId: activeChapter?.id || null,
          prompt: imgPrompt.trim(),
          style: imgStyle,
          kind: imgKind,
          aspectRatio: imgAspect,
          idempotencyKey: `img_${book.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImages((prev) => [data.image, ...prev]);
        await refreshBootstrap();
        notify('success', 'Illustration générée et enregistrée.');
      } else {
        notify('error', data.error || 'Impossible de générer l’illustration.');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const handleSetAsCover = async (url: string) => {
    if (!book) return;
    const res = await apiFetch(`/api/books/${book.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ coverImageUrl: url }),
    });
    if (res.ok) {
      const data = await res.json();
      setBook(data.book);
      notify('success', 'Image définie comme couverture du livre.');
    }
  };

  const handleInsertImageInChapter = (url: string, caption?: string) => {
    if (!activeChapter) {
      notify('error', 'Sélectionnez d’abord un chapitre.');
      return;
    }
    const figHtml = `<figure><img src="${url}" alt="${caption || 'Illustration'}" />${
      caption ? `<figcaption>${caption}</figcaption>` : ''
    }</figure><p></p>`;
    const nextHtml = `${chapterHtmlDraft || ''}${figHtml}`;
    setChapterHtmlDraft(nextHtml);
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
    setShowEditorImagePicker(false);
    setActiveTab('editor');
    notify('success', 'Illustration insérée dans le chapitre actif.');
  };

  const handleSaveCoverOrLayout = async (patch: Partial<Book>) => {
    if (!book) return;
    const res = await apiFetch(`/api/books/${book.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setBook(data.book);
      notify('success', 'Mise à jour enregistrée.');
    }
  };

  const handleRunProofread = async () => {
    if (!book) return;
    setAiWorking(true);
    try {
      const res = await apiFetch('/api/ai/proofread', {
        method: 'POST',
        body: JSON.stringify({
          bookId: book.id,
          idempotencyKey: `proof_${book.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProofReport(data.report);
        setDismissedIssues([]);
        await refreshBootstrap();
        notify('success', 'Rapport de relecture éditoriale prêt.');
      } else {
        notify('error', data.error || 'Impossible d’analyser le manuscrit.');
      }
    } finally {
      setAiWorking(false);
    }
  };

  const handleApplyProofSuggestion = async (
    issueIndex: number,
    chapterNumber: number,
    excerpt: string,
    suggestion: string
  ) => {
    if (!book) return;
    const targetCh = chapters.find((c) => c.chapterNumber === chapterNumber);
    if (!targetCh) return;

    let updatedHtml = targetCh.contentHtml;
    if (excerpt && updatedHtml.includes(excerpt)) {
      updatedHtml = updatedHtml.replace(excerpt, suggestion);
    } else {
      updatedHtml = `${updatedHtml}\n<p>${suggestion}</p>`;
    }

    const res = await apiFetch(`/api/books/${book.id}/chapters/${targetCh.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ contentHtml: updatedHtml }),
    });

    if (res.ok) {
      const data = await res.json();
      setChapters((prev) => prev.map((c) => (c.id === data.chapter.id ? data.chapter : c)));
      if (activeChapterId === targetCh.id) {
        setChapterHtmlDraft(updatedHtml);
        if (editorRef.current) editorRef.current.innerHTML = updatedHtml;
      }
      setDismissedIssues((prev) => [...prev, issueIndex]);
      notify('success', 'Suggestion appliquée avec votre confirmation.');
    }
  };

  const handleExport = async (format: 'pdf' | 'epub' | 'html' | 'docx') => {
    if (!book) return;
    setExportingFormat(format);
    try {
      const res = await apiFetch(`/api/books/${book.id}/export`, {
        method: 'POST',
        body: JSON.stringify({
          format,
          fontFamily: book.layoutConfig.fontFamily,
          marginMm: book.layoutConfig.marginMm,
          pdfStandard: format === 'pdf' ? exportPdfStandard : 'standard',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify('error', err.error || `Export ${format.toUpperCase()} impossible.`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseSlug = book.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'ebook';
      const pdfSuffix =
        format === 'pdf' && exportPdfStandard !== 'standard'
          ? `-${exportPdfStandard.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          : '';
      a.download = `${baseSlug}${pdfSuffix}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      notify(
        'success',
        `Fichier ${format === 'pdf' && exportPdfStandard !== 'standard' ? exportPdfStandard : format.toUpperCase()} généré et téléchargé.`
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const tabs: Array<{ id: StudioTab; label: string; icon: React.ReactNode }> = [
    { id: 'setup', label: '1. Projet', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'outline', label: '2. Plan IA', icon: <ListTree className="h-3.5 w-3.5" /> },
    { id: 'editor', label: '3. Rédaction', icon: <PenTool className="h-3.5 w-3.5" /> },
    { id: 'illustrations', label: '4. Illustrations', icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: 'cover', label: '5. Couverture', icon: <Palette className="h-3.5 w-3.5" /> },
    { id: 'layout', label: '6. Mise en page', icon: <Layout className="h-3.5 w-3.5" /> },
    { id: 'proofread', label: '7. Relecture', icon: <FileCheck2 className="h-3.5 w-3.5" /> },
    { id: 'export', label: '8. Export', icon: <Download className="h-3.5 w-3.5" /> },
  ];

  const userPlan = bootstrap?.plans.find((p) => p.id === (bootstrap.user?.profile.plan || 'free'));

  return (
    <DashboardShell
      title={book ? book.title : 'Nouveau projet eBook'}
      breadcrumb="EBOOK STUDIO AI / Studio de création"
      action={
        <div className="flex items-center gap-2">
          {myBooks.length > 0 && (
            <select
              value={activeBookId || ''}
              onChange={(e) => setActiveBookId(e.target.value || undefined)}
              aria-label="Projet actif"
              className="max-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
            >
              <option value="">+ Nouveau projet…</option>
              {myBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          )}
          {book && (
            <button
              type="button"
              onClick={() => navigate({ name: 'reader', bookId: book.id })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aperçu lecteur</span>
            </button>
          )}
        </div>
      }
    >
      {/* 8-Step Horizontal Tab Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const disabled = !book && tab.id !== 'setup';
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 h-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      ) : (
        <div className="mt-6">
          {/* STEP 1: PROJECT SETUP */}
          {activeTab === 'setup' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 max-w-4xl space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    {setupMode === 'image'
                      ? 'Générateur d’eBook inspiré par une image'
                      : 'Configuration du projet éditorial'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {setupMode === 'image'
                      ? 'Importez une photo ou une illustration : Gemini Vision analyse son atmosphère et conçoit l’ouvrage, la couverture, le plan complet et l’ouverture du chapitre 1.'
                      : 'La langue du livre est indépendante de la langue de l’interface.'}
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1">
                  <button
                    type="button"
                    onClick={() => setSetupMode('classic')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      setupMode === 'classic'
                        ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Création classique</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupMode('image')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      setupMode === 'image'
                        ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Inspiré par image</span>
                  </button>
                </div>
              </div>

              {setupMode === 'image' ? (
                <div className="space-y-6">
                  {/* Image Upload + Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold mb-2">
                        1. Image d’inspiration *
                      </label>
                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleInspirationFileChange}
                        className="hidden"
                      />

                      {inspirationImage ? (
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                          <img
                            src={inspirationImage}
                            alt="Aperçu d'inspiration"
                            className="w-full aspect-[4/3] object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setInspirationImage('');
                              setInspirationImageLabel('');
                            }}
                            aria-label="Retirer l'image"
                            className="absolute top-2 right-2 rounded-lg bg-slate-950/75 p-1.5 text-white hover:bg-slate-950 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
                            {inspirationImageLabel || 'Image sélectionnée'}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageFileInputRef.current?.click()}
                          className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/50 hover:border-[#6D28D9] dark:hover:border-violet-500 transition-colors flex flex-col items-center justify-center gap-2 p-6 text-center cursor-pointer"
                        >
                          <div className="rounded-xl bg-violet-100 dark:bg-violet-950/60 p-3 text-[#6D28D9] dark:text-violet-400">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Importer une photo ou illustration
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            PNG, JPEG ou WebP — Utilisée aussi comme base de couverture
                          </div>
                        </button>
                      )}

                      {inspirationImage && (
                        <button
                          type="button"
                          onClick={() => imageFileInputRef.current?.click()}
                          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Changer d’image</span>
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5">
                          2. Orientation créative (optionnel)
                        </label>
                        <textarea
                          rows={3}
                          value={inspirationHint}
                          onChange={(e) => setInspirationHint(e.target.value)}
                          placeholder="Ex. Transformer cette ambiance en essai poétique sur l’architecture, ou en roman d’enquête atmosphérique, ou en guide pratique illustré…"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Auteur</label>
                          <input
                            type="text"
                            value={formAuthor}
                            onChange={(e) => setFormAuthor(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Langue de l’eBook</label>
                          <select
                            value={formLang}
                            onChange={(e) => setFormLang(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                          >
                            {(bootstrap?.languages || []).map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.nativeName} ({l.name})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Chapitres (3–12)</label>
                          <input
                            type="number"
                            min={3}
                            max={12}
                            value={formChaptersCount}
                            onChange={(e) => setFormChaptersCount(Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Longueur</label>
                          <select
                            value={formLength}
                            onChange={(e) => setFormLength(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                          >
                            <option value="short">Court</option>
                            <option value="medium">Moyen</option>
                            <option value="long">Approfondi</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick-pick Studio Assets */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ou choisissez une image de la galerie Studio pour tester instantanément :
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                      {[...STUDIO_ILLUSTRATION_ASSETS, ...STUDIO_COVER_ASSETS.slice(0, 2)].map((asset) => {
                        const selected = inspirationImage === asset.url;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setInspirationImage(asset.url);
                              setInspirationImageLabel(asset.title);
                            }}
                            className={`group relative overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-[#6D28D9] ring-2 ring-[#6D28D9]/40'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                            }`}
                          >
                            <img
                              src={asset.url}
                              alt={asset.title}
                              className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="px-1.5 py-1 text-[10px] font-medium truncate bg-white dark:bg-slate-900">
                              {asset.title}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Génère automatiquement : titre, synopsis, palette harmonisée, plan structuré et chapitre 1 rédigé.
                    </div>
                    <button
                      type="button"
                      disabled={aiWorking || !inspirationImage}
                      onClick={handleCreateFromImage}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span>
                        {aiWorking
                          ? 'Analyse visuelle & création en cours…'
                          : `Analyser l’image & Générer l’eBook (${bootstrap?.aiCosts?.from_image ?? 10} crédits)`}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Titre du livre *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex. Architecture des Systèmes Distribués Modernes"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Sous-titre</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Guide pratique d’ingénierie et de résilience"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Auteur</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Langue de rédaction du livre</label>
                  <select
                    value={formLang}
                    onChange={(e) => setFormLang(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    {(bootstrap?.languages || []).map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    {(bootstrap?.categories || []).map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Sujet principal</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Thématique centrale"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Public cible</label>
                  <input
                    type="text"
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Style rédactionnel</label>
                  <input
                    type="text"
                    value={formStyle}
                    onChange={(e) => setFormStyle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Chapitres</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={formChaptersCount}
                      onChange={(e) => setFormChaptersCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Longueur</label>
                    <select
                      value={formLength}
                      onChange={(e) => setFormLength(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    >
                      <option value="short">Court</option>
                      <option value="medium">Moyen</option>
                      <option value="long">Approfondi</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Description / Synopsis</label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Décrivez les objectifs pédagogiques ou narratifs de l’ouvrage…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={() => handleSaveProjectSetup(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>
                    {aiWorking
                      ? 'Génération en cours…'
                      : `Enregistrer & Générer le plan (${bootstrap?.aiCosts?.outline ?? 5} crédits)`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={() => handleSaveProjectSetup(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{book ? 'Mettre à jour' : 'Créer sans plan IA'}</span>
                </button>
              </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: OUTLINE */}
          {activeTab === 'outline' && book && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div>
                  <h2 className="font-display text-lg font-bold">Structure & Table des matières</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modifiez, réorganisez, supprimez ou ajoutez des chapitres avant la rédaction.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={handleGenerateOutline}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>
                    {aiWorking
                      ? 'Génération Gemini…'
                      : `Générer / Régénérer le plan (${bootstrap?.aiCosts?.outline ?? 5} crédits)`}
                  </span>
                </button>
              </div>

              {visualAnalysisNote && (
                <div className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/70 dark:bg-violet-950/30 p-4 text-xs flex flex-col sm:flex-row sm:items-center gap-4">
                  {book.coverImageUrl && (
                    <img
                      src={book.coverImageUrl}
                      alt="Image d'inspiration"
                      className="h-16 w-20 rounded-lg object-cover shrink-0 border border-violet-200 dark:border-violet-800"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-[#6D28D9] dark:text-violet-300">
                      Analyse visuelle Gemini de votre image d’inspiration
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{visualAnalysisNote}</p>
                  </div>
                </div>
              )}

              {outlineMeta && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outlineMeta.introduction && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
                      <div className="font-semibold text-[#6D28D9] dark:text-violet-400">Introduction suggérée</div>
                      <p className="mt-1.5 text-slate-600 dark:text-slate-300">{outlineMeta.introduction}</p>
                    </div>
                  )}
                  {outlineMeta.conclusion && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
                      <div className="font-semibold text-[#6D28D9] dark:text-violet-400">Conclusion suggérée</div>
                      <p className="mt-1.5 text-slate-600 dark:text-slate-300">{outlineMeta.conclusion}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="text-xs font-mono text-[#6D28D9] dark:text-violet-400">
                        Chapitre {ch.chapterNumber} · {ch.wordCount.toLocaleString()} mots
                      </div>
                      <input
                        type="text"
                        defaultValue={ch.title}
                        onBlur={async (e) => {
                          if (e.target.value !== ch.title) {
                            await apiFetch(`/api/books/${book.id}/chapters/${ch.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ title: e.target.value }),
                            });
                            setChapters((prev) =>
                              prev.map((item) =>
                                item.id === ch.id ? { ...item, title: e.target.value } : item
                              )
                            );
                          }
                        }}
                        className="w-full font-display text-base font-semibold bg-transparent border-b border-transparent focus:border-[#6D28D9] focus:outline-none"
                      />
                      {ch.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">
                          {ch.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(idx, -1)}
                        disabled={idx === 0}
                        className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 disabled:opacity-30 cursor-pointer"
                        title="Monter"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(idx, 1)}
                        disabled={idx === chapters.length - 1}
                        className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 disabled:opacity-30 cursor-pointer"
                        title="Descendre"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChapterId(ch.id);
                          setChapterTitleDraft(ch.title);
                          setChapterHtmlDraft(ch.contentHtml);
                          setActiveTab('editor');
                        }}
                        className="rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Rédiger
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(ch.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Titre du nouveau chapitre…"
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter un chapitre</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RICH CONTENT EDITOR + 10 AI TOOLS */}
          {activeTab === 'editor' && book && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Chapter Sidebar */}
              <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Chapitres ({chapters.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="text-xs font-semibold text-[#6D28D9] dark:text-violet-400 cursor-pointer"
                  >
                    + Ajouter
                  </button>
                </div>

                {chapters.length === 0 ? (
                  <p className="p-2 text-xs text-slate-500">
                    Générez un plan ou ajoutez un chapitre pour commencer à rédiger.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {chapters.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setActiveChapterId(ch.id);
                          setChapterTitleDraft(ch.title);
                          setChapterHtmlDraft(ch.contentHtml);
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
                          ch.id === activeChapterId
                            ? 'bg-[#0F172A] text-white dark:bg-[#6D28D9]'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {ch.chapterNumber}. {ch.title}
                        </div>
                        <div className="text-[10px] opacity-75 tabular-nums">
                          {ch.wordCount.toLocaleString()} mots
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Rich Text Editor */}
              <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {!activeChapter ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Sélectionnez ou ajoutez un chapitre.
                  </div>
                ) : (
                  <>
                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-[#F8F8FA] dark:bg-slate-950/50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => execEditorFormat('formatBlock', 'h1')}
                          className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('formatBlock', 'h2')}
                          className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('formatBlock', 'h3')}
                          className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('formatBlock', 'p')}
                          className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('bold')}
                          className="rounded px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('italic')}
                          className="rounded px-2 py-1 text-xs italic hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('insertUnorderedList')}
                          className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Liste
                        </button>
                        <button
                          type="button"
                          onClick={() => execEditorFormat('formatBlock', 'blockquote')}
                          className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Citation
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertHtmlSnippet(
                              '<table><thead><tr><th>Critère</th><th>Détail</th></tr></thead><tbody><tr><td>Point 1</td><td>Analyse</td></tr></tbody></table><p></p>'
                            )
                          }
                          className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Tableau
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditorImagePicker((v) => !v);
                            setShowEditorLinkBar(false);
                          }}
                          className={`rounded px-2 py-1 text-xs cursor-pointer inline-flex items-center gap-1 ${
                            showEditorImagePicker
                              ? 'bg-[#6D28D9] text-white'
                              : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          <ImageIcon className="h-3 w-3" />
                          <span>Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditorLinkBar((v) => !v);
                            setShowEditorImagePicker(false);
                          }}
                          className={`rounded px-2 py-1 text-xs cursor-pointer ${
                            showEditorLinkBar
                              ? 'bg-[#6D28D9] text-white'
                              : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          Lien
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {saveState === 'saving'
                          ? 'Sauvegarde…'
                          : saveState === 'saved'
                            ? 'Enregistré'
                            : 'Auto-save actif'}
                      </div>
                    </div>

                    {showEditorLinkBar && (
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3 py-2">
                        <input
                          type="url"
                          value={editorLinkUrl}
                          onChange={(e) => setEditorLinkUrl(e.target.value)}
                          placeholder="https://…"
                          className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editorLinkUrl.trim()) {
                              execEditorFormat('createLink', editorLinkUrl.trim());
                              setEditorLinkUrl('');
                              setShowEditorLinkBar(false);
                            }
                          }}
                          className="rounded bg-[#0F172A] dark:bg-[#6D28D9] px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                        >
                          Appliquer
                        </button>
                      </div>
                    )}

                    {showEditorImagePicker && (
                      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span>Insérer une illustration dans ce chapitre</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditorImagePicker(false);
                              setActiveTab('illustrations');
                            }}
                            className="text-[#6D28D9] dark:text-violet-400 cursor-pointer"
                          >
                            Générer avec IA →
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            ...images.map((im) => ({
                              id: im.id,
                              title: im.prompt.slice(0, 32),
                              url: im.imageUrl,
                            })),
                            ...STUDIO_ILLUSTRATION_ASSETS.map((asset) => ({
                              id: asset.id,
                              title: asset.title,
                              url: asset.url,
                            })),
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleInsertImageInChapter(item.url, item.title)}
                              className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1.5 text-left hover:border-[#6D28D9] cursor-pointer"
                            >
                              <img
                                src={item.url}
                                alt={item.title}
                                className="aspect-[4/3] w-full rounded object-cover"
                              />
                              <div className="mt-1 truncate text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                {item.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-5 sm:p-7 space-y-4" dir={book.languageCode === 'ar' ? 'rtl' : 'ltr'}>
                      <input
                        type="text"
                        value={chapterTitleDraft}
                        onChange={(e) => setChapterTitleDraft(e.target.value)}
                        className="w-full font-display text-2xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 focus:border-[#6D28D9] focus:outline-none"
                      />

                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => setChapterHtmlDraft(e.currentTarget.innerHTML)}
                        className="min-h-[420px] book-prose text-base focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Gemini Writing Tools Panel */}
              <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
                <div>
                  <h3 className="font-display text-sm font-bold">Assistant Gemini</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Rédigez tout le chapitre ou appliquez une action sur la sélection.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={aiWorking || !activeChapter}
                  onClick={handleGenerateFullChapter}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6D28D9] px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-700 cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>
                    {aiWorking
                      ? 'Rédaction…'
                      : `Rédiger ce chapitre (${bootstrap?.aiCosts?.chapter_draft ?? 10} cr.)`}
                  </span>
                </button>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                  <label className="block text-xs font-medium">Outil de rédaction</label>
                  <select
                    value={aiToolAction}
                    onChange={(e) => setAiToolAction(e.target.value as typeof aiToolAction)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                  >
                    <option value="generate_paragraph">Générer un paragraphe</option>
                    <option value="continue">Continuer le texte</option>
                    <option value="rewrite">Réécrire</option>
                    <option value="expand">Développer</option>
                    <option value="summarize">Résumer</option>
                    <option value="fix_grammar">Corriger la grammaire</option>
                    <option value="improve_style">Améliorer le style</option>
                    <option value="translate">Traduire</option>
                    <option value="simplify">Simplifier</option>
                    <option value="change_tone">Changer le ton</option>
                  </select>

                  {aiToolAction === 'translate' && (
                    <select
                      value={aiTargetLang}
                      onChange={(e) => setAiTargetLang(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                    >
                      {(bootstrap?.languages || []).map((l) => (
                        <option key={l.code} value={l.code}>
                          Vers : {l.nativeName}
                        </option>
                      ))}
                    </select>
                  )}

                  {aiToolAction === 'change_tone' && (
                    <input
                      type="text"
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      placeholder="Ex. journalistique, poétique, formel…"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-2 text-xs"
                    />
                  )}

                  <textarea
                    rows={3}
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    placeholder="Consigne ou texte cible (laisser vide pour utiliser la sélection ou le chapitre)…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-2 text-xs"
                  />

                  <button
                    type="button"
                    disabled={aiWorking || !activeChapter}
                    onClick={handleRunAiTool}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    Exécuter l’outil ({bootstrap?.aiCosts?.[aiToolAction] ?? 3} crédits)
                  </button>
                </div>

                {aiPreviewHtml && (
                  <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-3 space-y-2.5">
                    <div className="text-[11px] font-semibold text-[#6D28D9] dark:text-violet-300">
                      Proposition Gemini
                    </div>
                    <div
                      className="max-h-48 overflow-y-auto text-xs prose dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: aiPreviewHtml }}
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyAiPreview('append')}
                        className="flex-1 rounded bg-[#6D28D9] px-2 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        Ajouter à la suite
                      </button>
                      <button
                        type="button"
                        onClick={() => applyAiPreview('replace')}
                        className="flex-1 rounded border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-[11px] font-semibold cursor-pointer"
                      >
                        Remplacer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: AI ILLUSTRATIONS */}
          {activeTab === 'illustrations' && book && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleGenerateIllustration}
                className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit"
              >
                <h2 className="font-display text-lg font-bold">Générateur d’illustrations IA</h2>
                {!userPlan?.allowAiIllustrations && bootstrap?.user?.profile.role !== 'admin' && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                    La génération d’images IA est activée à partir de l’offre Auteur Pro. Vous pouvez toutefois téléverser vos propres visuels ci-dessous.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Usage</label>
                    <select
                      value={imgKind}
                      onChange={(e) => setImgKind(e.target.value as typeof imgKind)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                    >
                      <option value="chapter">Illustration de chapitre</option>
                      <option value="cover">Image de couverture</option>
                      <option value="illustration">Illustration éditoriale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Style artistique</label>
                    <select
                      value={imgStyle}
                      onChange={(e) => setImgStyle(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                    >
                      <option value="editorial">Éditorial</option>
                      <option value="educational">Éducatif / Schéma</option>
                      <option value="artistic">Artistique</option>
                      <option value="realistic">Réaliste</option>
                      <option value="3d">Rendu 3D</option>
                      <option value="cartoon">Dessin animé</option>
                      <option value="minimalist">Minimaliste</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Format d’image</label>
                  <select
                    value={imgAspect}
                    onChange={(e) => setImgAspect(e.target.value as typeof imgAspect)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                  >
                    <option value="4:3">4:3 (Illustration chapitre)</option>
                    <option value="3:4">3:4 (Couverture livre)</option>
                    <option value="1:1">1:1 (Carré)</option>
                    <option value="16:9">16:9 (Panoramique)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Prompt de l’illustration</label>
                  <textarea
                    rows={4}
                    required
                    value={imgPrompt}
                    onChange={(e) => setImgPrompt(e.target.value)}
                    placeholder="Décrivez précisément la scène, les couleurs et l’ambiance souhaitée…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={aiWorking}
                  className="w-full rounded-lg bg-[#6D28D9] px-4 py-2.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  {aiWorking
                    ? 'Génération en cours…'
                    : `Générer l’illustration (${bootstrap?.aiCosts?.generate_image ?? 15} crédits)`}
                </button>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-medium mb-1.5">Ou importer une image locale</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = String(reader.result || '');
                        if (url) void handleSetAsCover(url);
                      };
                      reader.readAsDataURL(f);
                    }}
                    className="w-full text-xs"
                  />
                </div>
              </form>

              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-bold">Illustrations du livre ({images.length})</h2>
                  {images.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
                      Aucune illustration personnalisée générée pour ce livre pour le moment. Utilisez le générateur IA à gauche ou piochez dans la bibliothèque Studio ci-dessous.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-3"
                        >
                          <img
                            src={img.imageUrl}
                            alt={img.prompt}
                            referrerPolicy="no-referrer"
                            className="aspect-[4/3] w-full rounded-lg object-cover"
                          />
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {img.prompt}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetAsCover(img.imageUrl)}
                              className="rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              Définir en couverture
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertImageInChapter(img.imageUrl)}
                              className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                            >
                              Insérer au chapitre
                            </button>
                            <button
                              type="button"
                              onClick={() => setImgPrompt(img.prompt)}
                              className="rounded-md px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              Réutiliser prompt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-base font-bold">
                      Collection d’illustrations eBook prêtes à l’emploi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Planches éditoriales, schémas et scènes artistiques utilisables en un clic dans vos chapitres.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {STUDIO_ILLUSTRATION_ASSETS.map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5"
                      >
                        <img
                          src={asset.url}
                          alt={asset.title}
                          className="aspect-[4/3] w-full rounded-lg object-cover"
                        />
                        <div>
                          <div className="font-display text-sm font-semibold">{asset.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {asset.style} · {asset.aspect}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleInsertImageInChapter(asset.url, asset.title)}
                            className="rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                          >
                            Insérer au chapitre
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAsCover(asset.url)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                          >
                            Couverture
                          </button>
                          <button
                            type="button"
                            onClick={() => setImgPrompt(asset.prompt)}
                            className="rounded-md px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Copier prompt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: COVER DESIGNER */}
          {activeTab === 'cover' && book && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
                <h2 className="font-display text-lg font-bold">Concepteur de couverture</h2>

                <div>
                  <label className="block text-xs font-medium mb-2">Modèles rapides</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(bootstrap?.templates || []).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          setBook((prev) =>
                            prev ? { ...prev, coverConfig: { ...tpl.coverConfig } } : prev
                          )
                        }
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-left text-xs hover:border-[#6D28D9] cursor-pointer"
                      >
                        <div className="font-semibold truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-500">{tpl.isPremium ? 'Pro' : 'Standard'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Couleur de fond</label>
                    <input
                      type="color"
                      value={book.coverConfig.backgroundColor}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, backgroundColor: e.target.value },
                        })
                      }
                      className="h-9 w-full rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Couleur d’accent</label>
                    <input
                      type="color"
                      value={book.coverConfig.accentColor}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, accentColor: e.target.value },
                        })
                      }
                      className="h-9 w-full rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Couleur du texte</label>
                    <input
                      type="color"
                      value={book.coverConfig.textColor}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, textColor: e.target.value },
                        })
                      }
                      className="h-9 w-full rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Typographie</label>
                    <select
                      value={book.coverConfig.fontFamily}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: {
                            ...book.coverConfig,
                            fontFamily: e.target.value as CoverConfig['fontFamily'],
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                    >
                      <option value="display">Display Moderne</option>
                      <option value="serif">Sérif Éditorial</option>
                      <option value="mono">Monospace Technique</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Alignement</label>
                    <select
                      value={book.coverConfig.titleAlign}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: {
                            ...book.coverConfig,
                            titleAlign: e.target.value as CoverConfig['titleAlign'],
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                    >
                      <option value="left">Aligné à gauche</option>
                      <option value="center">Centré</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Étiquette de collection</label>
                    <input
                      type="text"
                      value={book.coverConfig.badgeText || ''}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, badgeText: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Image de fond (ou choisissez une galerie d’atelier)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {STUDIO_COVER_ASSETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.title}
                        onClick={() => setBook({ ...book, coverImageUrl: preset.url })}
                        className={`h-14 w-11 overflow-hidden rounded border-2 cursor-pointer ${
                          book.coverImageUrl === preset.url
                            ? 'border-[#6D28D9]'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <img src={preset.url} alt={preset.title} className="h-full w-full object-cover" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBook({ ...book, coverImageUrl: null })}
                      className="rounded border border-slate-200 dark:border-slate-700 px-2.5 text-xs cursor-pointer"
                    >
                      Sans image
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={book.coverConfig.showSubtitle}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, showSubtitle: e.target.checked },
                        })
                      }
                    />
                    <span>Afficher le sous-titre</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={book.coverConfig.showAuthor}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          coverConfig: { ...book.coverConfig, showAuthor: e.target.checked },
                        })
                      }
                    />
                    <span>Afficher l’auteur</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSaveCoverOrLayout({
                      coverConfig: book.coverConfig,
                      coverImageUrl: book.coverImageUrl,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Enregistrer la couverture</span>
                </button>
              </div>

              <div className="lg:col-span-5 max-w-[320px] w-full mx-auto space-y-3">
                <div className="text-xs font-semibold text-center text-slate-500">
                  Aperçu en direct
                </div>
                <BookCoverPreview
                  title={book.title}
                  subtitle={book.subtitle}
                  authorName={book.authorName}
                  coverImageUrl={book.coverImageUrl}
                  coverConfig={book.coverConfig}
                />
              </div>
            </div>
          )}

          {/* STEP 6: PAGE LAYOUT */}
          {activeTab === 'layout' && book && (
            <div className="max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <h2 className="font-display text-lg font-bold">Mise en page & Typographie d’export</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Format de page</label>
                  <select
                    value={book.layoutConfig.pageFormat}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        layoutConfig: {
                          ...book.layoutConfig,
                          pageFormat: e.target.value as LayoutConfig['pageFormat'],
                        },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="A5">A5 (148 × 210 mm — Livre)</option>
                    <option value="Letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Marges (mm)</label>
                  <input
                    type="number"
                    min={10}
                    max={40}
                    value={book.layoutConfig.marginMm}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        layoutConfig: { ...book.layoutConfig, marginMm: Number(e.target.value) },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Interligne</label>
                  <input
                    type="number"
                    step={0.05}
                    min={1.2}
                    max={2.2}
                    value={book.layoutConfig.lineHeight}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        layoutConfig: { ...book.layoutConfig, lineHeight: Number(e.target.value) },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Police du corps</label>
                      <select
                    value={book.layoutConfig.fontFamily}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        layoutConfig: {
                          ...book.layoutConfig,
                          fontFamily: e.target.value as LayoutConfig['fontFamily'],
                        },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="serif">Sérif Classique (Roman/Essai)</option>
                    <option value="sans">Sans-Sérif Moderne (Technique)</option>
                    <option value="mono">Monospace (Courier / Code)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Taille (pt)</label>
                  <input
                    type="number"
                    min={9}
                    max={15}
                    value={book.layoutConfig.fontSizePt}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        layoutConfig: { ...book.layoutConfig, fontSizePt: Number(e.target.value) },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                {[
                  { key: 'includeCoverPage', label: 'Inclure la page de couverture' },
                  { key: 'includeToc', label: 'Table des matières automatique' },
                  { key: 'showHeader', label: 'Afficher les en-têtes (Titre)' },
                  { key: 'showFooter', label: 'Afficher les pieds de page (Auteur)' },
                  { key: 'showPageNumbers', label: 'Numérotation des pages (PDF)' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(book.layoutConfig[opt.key as keyof LayoutConfig])}
                      onChange={(e) =>
                        setBook({
                          ...book,
                          layoutConfig: { ...book.layoutConfig, [opt.key]: e.target.checked },
                        })
                      }
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSaveCoverOrLayout({ layoutConfig: book.layoutConfig })}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Sauvegarder la mise en page</span>
              </button>
            </div>
          )}

          {/* STEP 7: PROOFREADING */}
          {activeTab === 'proofread' && book && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div>
                  <h2 className="font-display text-lg font-bold">Assistant de relecture éditoriale IA</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Analyse les erreurs, répétitions, incohérences et passages incomplets. Aucune modification n’est appliquée sans votre validation.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={handleRunProofread}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>
                    {aiWorking
                      ? 'Analyse du manuscrit…'
                      : `Lancer l’audit (${bootstrap?.aiCosts?.proofread ?? 8} crédits)`}
                  </span>
                </button>
              </div>

              {proofReport && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                    <h3 className="font-display text-base font-bold">Rapport synthétique</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {proofReport.executiveSummary}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Structure :</strong> {proofReport.structureFeedback}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {proofReport.issues.map((issue, idx) => {
                      if (dismissedIssues.includes(idx)) return null;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#6D28D9] dark:text-violet-400">
                              Chapitre {issue.chapterNumber} · {issue.category} · Priorité {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{issue.explanation}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="rounded-lg bg-red-50/60 dark:bg-red-950/20 p-3">
                              <div className="font-semibold text-red-700 dark:text-red-300 mb-1">
                                Extrait actuel
                              </div>
                              <div>{issue.excerpt}</div>
                            </div>
                            <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                              <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                                Suggestion proposée
                              </div>
                              <div>{issue.suggestion}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleApplyProofSuggestion(
                                  idx,
                                  issue.chapterNumber,
                                  issue.excerpt,
                                  issue.suggestion
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] dark:bg-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Appliquer cette suggestion</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDismissedIssues((prev) => [...prev, idx])}
                              className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs cursor-pointer"
                            >
                              Ignorer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 8: EXPORT & PUBLICATION */}
          {activeTab === 'export' && book && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
                <h2 className="font-display text-lg font-bold">Exporter votre eBook</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Les exports conservent la couverture, la table des matières, vos chapitres, les illustrations et vos réglages de mise en page.
                </p>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck className="h-4 w-4 text-[#6D28D9] dark:text-violet-400 shrink-0" />
                    <span>Norme d’archivage PDF/A (ISO 19005)</span>
                  </div>
                  <select
                    value={exportPdfStandard}
                    onChange={(e) => setExportPdfStandard(e.target.value as PdfStandard)}
                    aria-label="Norme PDF/A"
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium"
                  >
                    <option value="standard">PDF Standard</option>
                    <option value="PDF/A-1b">PDF/A-1b (ISO 19005-1)</option>
                    <option value="PDF/A-2b">PDF/A-2b (ISO 19005-2)</option>
                    <option value="PDF/A-3b">PDF/A-3b (ISO 19005-3)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'pdf',
                        label: exportPdfStandard === 'standard' ? 'PDF Haute Qualité' : `${exportPdfStandard} Archival`,
                        desc:
                          exportPdfStandard === 'standard'
                            ? 'Format A4/A5/Letter paginé pour impression et lecture'
                            : 'Archivage longue durée ISO 19005 avec polices incorporées et profil sRGB',
                      },
                      { id: 'epub', label: 'EPUB 3 Standard', desc: 'Compatible Kindle, Kobo, Apple Books (inclut RTL)' },
                      { id: 'html', label: 'HTML5 Autonome', desc: 'Page web sémantique publiable directement' },
                      { id: 'docx', label: 'Microsoft Word (.docx)', desc: 'Manuscrit éditable pour révision externe' },
                    ] as const
                  ).map((fmt) => {
                    const allowed =
                      userPlan?.allowedExports.includes(fmt.id) ||
                      bootstrap?.user?.profile.role === 'admin';
                    return (
                      <div
                        key={fmt.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="font-display text-sm font-bold">{fmt.label}</div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fmt.desc}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!allowed || exportingFormat !== null}
                          onClick={() => handleExport(fmt.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F172A] dark:bg-[#6D28D9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>
                            {!allowed
                              ? 'Offre Pro requise'
                              : exportingFormat === fmt.id
                                ? 'Génération…'
                                : fmt.id === 'pdf' && exportPdfStandard !== 'standard'
                                  ? `Télécharger ${exportPdfStandard}`
                                  : `Télécharger ${fmt.id.toUpperCase()}`}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit">
                <h2 className="font-display text-lg font-bold">Statut & Publication</h2>

                <div>
                  <label className="block text-xs font-medium mb-1">Statut du manuscrit</label>
                  <select
                    value={book.status}
                    onChange={(e) => handleSaveCoverOrLayout({ status: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="published">Publié</option>
                  </select>
                </div>

                <label className="flex items-start gap-2.5 text-xs cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={book.isPublic}
                    onChange={(e) => handleSaveCoverOrLayout({ isPublic: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Publier dans la bibliothèque publique</strong> — Permet aux visiteurs de consulter et lire ce livre.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate({ name: 'book-detail', bookId: book.id })}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Voir la fiche du livre</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AiWriterAssistantPanel
        bookId={book?.id}
        activeChapterId={activeChapter?.id}
        draftContext={{
          title: book?.title || formTitle,
          subtitle: book?.subtitle || formSubtitle,
          subject: book?.subject || formSubject,
          description: book?.description || formDescription,
          languageCode: book?.languageCode || formLang,
          categorySlug: book?.categorySlug || formCategory,
          targetAudience: book?.targetAudience || formAudience,
          writingStyle: book?.writingStyle || formStyle,
          activeChapterTitle: activeChapter ? chapterTitleDraft || activeChapter.title : undefined,
          activeChapterExcerpt: activeChapter
            ? chapterHtmlDraft.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
              activeChapter.summary
            : undefined,
        }}
        canInsertToChapter={Boolean(book && activeChapter)}
        onInsertToChapter={(html) => {
          if (!activeChapter) return;
          const nextHtml = `${chapterHtmlDraft || ''}\n${html}`;
          setChapterHtmlDraft(nextHtml);
          if (editorRef.current) editorRef.current.innerHTML = nextHtml;
          setActiveTab('editor');
          notify('success', 'Suggestion insérée dans le chapitre actif.');
        }}
      />
    </DashboardShell>
  );
};
