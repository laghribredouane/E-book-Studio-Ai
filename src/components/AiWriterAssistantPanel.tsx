import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  Copy,
  Maximize2,
  MessageSquareText,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiWriterAssistantPanelProps {
  bookId?: string;
  activeChapterId?: string | null;
  draftContext: {
    title?: string;
    subtitle?: string;
    subject?: string;
    description?: string;
    languageCode?: string;
    categorySlug?: string;
    targetAudience?: string;
    writingStyle?: string;
    activeChapterTitle?: string;
    activeChapterExcerpt?: string;
  };
  canInsertToChapter: boolean;
  onInsertToChapter: (html: string) => void;
}

const QUICK_PROMPTS = [
  {
    label: 'Conseils d’écriture',
    prompt:
      'Analyse la structure et le style de mon projet (et du chapitre actif s’il existe), puis donne-moi 3 conseils d’écriture concrets et actionnables.',
  },
  {
    label: 'Développement de personnage',
    prompt:
      'Propose des pistes de développement psychologique (motivations, conflit interne, arc d’évolution et détails mémorables) adaptées à mon livre.',
  },
  {
    label: 'Idées d’intrigue',
    prompt:
      'Suggère 3 idées d’intrigue, rebondissements ou axes narratifs forts pour dynamiser la progression de ce livre.',
  },
  {
    label: 'Accroche de chapitre',
    prompt:
      'Rédige 2 propositions d’ouverture percutantes pour capter immédiatement l’attention du lecteur dès la première phrase.',
  },
];

function formatAssistantTextToHtml(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  const htmlParts: string[] = [];

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ''))}</li>`)
        .join('');
      htmlParts.push(`<ul>${items}</ul>`);
    } else if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
      htmlParts.push(`<h3>${inline(lines[0].replace(/^#{1,3}\s+/, ''))}</h3>`);
    } else {
      htmlParts.push(`<p>${lines.map(inline).join('<br />')}</p>`);
    }
  }

  return htmlParts.join('\n');
}

function renderFormattedMessage(content: string): React.ReactNode {
  const blocks = content.split(/\n{2,}/);

  const renderInline = (line: string, keyPrefix: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={`${keyPrefix}-${idx}`} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={`${keyPrefix}-${idx}`}
            className="rounded bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, bIdx) => {
        const lines = block
          .split('\n')
          .map((l) => l.trimEnd())
          .filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="list-disc pl-4 space-y-1">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>{renderInline(l.replace(/^\s*[-*•]\s+/, ''), `${bIdx}-${lIdx}`)}</li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="list-decimal pl-4 space-y-1">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>
                  {renderInline(l.replace(/^\s*\d+[.)]\s+/, ''), `${bIdx}-${lIdx}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((l, lIdx) => {
              if (/^#{1,3}\s+/.test(l)) {
                return (
                  <div
                    key={lIdx}
                    className="font-display text-xs font-bold text-[#0F172A] dark:text-violet-300 pt-1"
                  >
                    {renderInline(l.replace(/^#{1,3}\s+/, ''), `${bIdx}-${lIdx}`)}
                  </div>
                );
              }
              return <p key={lIdx}>{renderInline(l, `${bIdx}-${lIdx}`)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export const AiWriterAssistantPanel: React.FC<AiWriterAssistantPanelProps> = ({
  bookId,
  activeChapterId,
  draftContext,
  canInsertToChapter,
  onInsertToChapter,
}) => {
  const { apiFetch, bootstrap, notify, refreshBootstrap } = useApp();
  const storageKey = `ebook_writer_chat_${bookId || 'draft'}`;

  const [isOpen, setIsOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as AssistantChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages when switching active book project
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      setMessages(saved ? (JSON.parse(saved) as AssistantChatMessage[]) : []);
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      // Ignore storage quota errors
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const sendMessage = async (textOverride?: string) => {
    const prompt = (textOverride ?? input).trim();
    if (!prompt || streaming) return;

    const userMsg: AssistantChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt,
    };
    const assistantMsgId = `a-${Date.now()}`;
    const priorHistory = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);
    if (!textOverride) setInput('');
    setStreaming(true);

    try {
      const res = await apiFetch('/api/ai/writer-chat', {
        method: 'POST',
        body: JSON.stringify({
          bookId: bookId || undefined,
          activeChapterId: activeChapterId || undefined,
          message: prompt,
          history: priorHistory,
          draftContext,
          idempotencyKey: `wchat_${bookId || 'draft'}_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMessage = err.error || 'Impossible de contacter Gemini.';
        notify('error', errMessage);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        return;
      }

      if (!res.body) {
        throw new Error('Flux de réponse vide.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine.slice(6)) as {
              type: 'meta' | 'delta' | 'done' | 'error';
              text?: string;
              error?: string;
            };

            if (payload.type === 'delta' && payload.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + payload.text } : m
                )
              );
            } else if (payload.type === 'error') {
              notify('error', payload.error || 'Erreur lors de la réponse IA.');
            }
          } catch {
            // Ignore malformed SSE chunk
          }
        }
      }

      await refreshBootstrap();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur réseau';
      notify('error', msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? { ...m, content: 'Une erreur est survenue pendant la génération. Réessayez.' }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      notify('info', 'Sélectionnez le texte manuellement pour le copier.');
    }
  };

  const handleClear = () => {
    setMessages([]);
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const costPerTurn = bootstrap?.aiCosts?.writer_chat ?? 1;
  const contextLabel = [
    draftContext.title || 'Nouveau projet',
    draftContext.activeChapterTitle || null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir AI Writer Assistant"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-xl bg-[#0F172A] dark:bg-[#6D28D9] px-4 py-3 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10 hover:bg-[#1E293B] dark:hover:bg-violet-700 transition-all cursor-pointer"
      >
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span>AI Writer Assistant</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="AI Writer Assistant"
      className={`fixed bottom-5 right-5 z-40 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all ${
        isWide
          ? 'w-[calc(100vw-2rem)] sm:w-[520px] h-[620px]'
          : 'w-[calc(100vw-2rem)] sm:w-[400px] h-[540px]'
      } max-h-[calc(100vh-5rem)]`}
    >
      {/* Floating Panel Header */}
      <div className="flex items-center justify-between gap-2 bg-[#0F172A] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6D28D9] text-amber-300">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold leading-tight truncate">
              AI Writer Assistant
            </div>
            <div className="text-[11px] text-slate-300 truncate">{contextLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={streaming}
              title="Nouvelle conversation"
              className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsWide((w) => !w)}
            title={isWide ? 'Vue compacte' : 'Agrandir le panneau'}
            className="hidden sm:inline-flex rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            {isWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Fermer l’assistant"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAF9] dark:bg-slate-950/60">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6D28D9] dark:text-violet-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Coach éditorial Gemini connecté à votre projet</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Posez vos questions sur le style, la psychologie de vos personnages, la structure des chapitres ou demandez des idées de rebondissements.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                Suggestions rapides
              </div>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={streaming}
                    onClick={() => sendMessage(item.prompt)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-left hover:border-[#6D28D9] transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    isUser
                      ? 'bg-[#0F172A] dark:bg-[#6D28D9] text-white rounded-br-sm'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : msg.content ? (
                    renderFormattedMessage(msg.content)
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#6D28D9]" />
                      <span>Réflexion en cours…</span>
                    </span>
                  )}
                </div>

                {!isUser && msg.content && !streaming && (
                  <div className="mt-1.5 flex items-center gap-2 px-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>

                    {canInsertToChapter && (
                      <button
                        type="button"
                        onClick={() => onInsertToChapter(formatAssistantTextToHtml(msg.content))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6D28D9] dark:text-violet-400 hover:underline cursor-pointer"
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        <span>Insérer au chapitre</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips bar when chat already has messages */}
      {messages.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={streaming}
              onClick={() => sendMessage(item.prompt)}
              className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:border-[#6D28D9] hover:text-[#6D28D9] cursor-pointer disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Demandez un conseil d’écriture, un arc de personnage ou une idée d’intrigue…"
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:border-[#6D28D9] focus:outline-none"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6D28D9] text-white hover:bg-violet-700 disabled:opacity-40 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5 tabular-nums">
          <span>Entrée pour envoyer · Maj+Entrée pour saut de ligne</span>
          <span>
            {costPerTurn} crédit / msg · Solde :{' '}
            {(bootstrap?.user?.creditBalance ?? 0).toLocaleString()}
          </span>
        </div>
      </form>
    </aside>
  );
};
