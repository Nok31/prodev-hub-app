'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  Bot,
  Plus,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

import { apiStreamFetch, ApiError } from '@/services/auth';
import { prodevService } from '@/services/prodev.service';
import type {
  AiAgent,
  AiConversation,
  AiConversationDetail,
} from './types';

interface AssistantModuleProps {
  cardClass: string;
  isLight: boolean;
  onForbidden?: () => void;
}

function unwrap<T>(value: any): T {
  return (value?.data ?? value) as T;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

function toUIMessages(
  messages: AiConversationDetail['messages'],
): UIMessage[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: message.content ?? '' }],
    }));
}

interface ChatPanelProps {
  conversationId: string;
  initialMessages: UIMessage[];
  welcomeMessage?: string;
  isLight: boolean;
}

function ChatPanel({
  conversationId,
  initialMessages,
  welcomeMessage,
  isLight,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${(
          process.env.NEXT_PUBLIC_API_BASE ||
          'https://hub.prodev.cl/api/v1'
        ).replace(/\/$/, '')}/ai/chat`,
        credentials: 'include',
        fetch: apiStreamFetch,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            conversationId,
            messages,
          },
        }),
      }),
    [conversationId],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    clearError,
  } = useChat({ transport });

  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId, initialMessages, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isBusy = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const text = input.trim();
    if (!text || isBusy) return;

    setInput('');
    clearError();

    try {
      await sendMessage({ text });
    } catch {
      // El SDK conserva el error en su estado.
    }
  };

  const muted = isLight ? 'text-slate-500' : 'text-slate-400';
  const assistantBubble = isLight
    ? 'bg-slate-100 text-slate-800'
    : 'bg-slate-800/90 text-slate-100';
  const userBubble = 'bg-blue-600 text-white';

  return (
    <div className="flex flex-col min-h-[420px] h-[calc(100dvh-245px)] max-h-[720px]">
      <div className="flex-1 overflow-y-auto space-y-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center min-h-[250px] px-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="font-bold text-base mb-2">
              ¿En qué puedo ayudarte?
            </h3>
            <p className={`text-xs max-w-xs ${muted}`}>
              {welcomeMessage ||
                'Escribe tu consulta para comenzar una conversación.'}
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const text = message.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('');

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words ${
                  isUser ? userBubble : assistantBubble
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-blue-500">
                    <Bot className="w-3.5 h-3.5" />
                    ASISTENTE
                  </div>
                )}
                {text || (
                  <span className={muted}>Procesando respuesta...</span>
                )}
              </div>
            </div>
          );
        })}

        {isBusy && (
          <div className={`flex items-center gap-2 text-xs ${muted}`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            El asistente está escribiendo...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{getErrorMessage(error)}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex items-end gap-2 pt-3 border-t ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escribe un mensaje..."
          rows={1}
          disabled={isBusy}
          className={`flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
          }`}
        />

        <button
          type="submit"
          disabled={!input.trim() || isBusy}
          className="w-11 h-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition"
          aria-label="Enviar mensaje"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
      <p className={`text-[10px] text-center mt-2 ${muted}`}>
        Enter para enviar · Shift + Enter para nueva línea
      </p>
    </div>
  );
}

export default function AssistantModule({
  cardClass,
  isLight,
  onForbidden,
}: AssistantModuleProps) {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [activeConversation, setActiveConversation] =
    useState<AiConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    const response: any = await prodevService.getAiConversations({
      page: 1,
      pageSize: 30,
    });

    const rows = Array.isArray(response)
      ? response
      : response?.data ?? [];

    setConversations(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError(null);

      try {
        const response: any = await prodevService.getAiAgents();
        const rows: AiAgent[] = Array.isArray(response)
          ? response
          : response?.data ?? [];

        if (cancelled) return;

        setAgents(rows);

        if (rows.length > 0) {
          setSelectedAgent(rows[0].id);
        }

        await loadConversations();
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 403) {
          onForbidden?.();
          return;
        }

        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadConversations, onForbidden]);

  const openConversation = async (id: string) => {
    setLoadingChat(true);
    setError(null);

    try {
      const response: any = await prodevService.getAiConversation(id);
      const detail = unwrap<AiConversationDetail>(response);

      setActiveConversation(detail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingChat(false);
    }
  };

  const createConversation = async () => {
    if (!selectedAgent || creating) return;

    setCreating(true);
    setError(null);

    try {
      const response: any = await prodevService.createAiConversation({
        agentId: selectedAgent,
      });

      const created = unwrap<AiConversation>(response);

      if (!created?.id) {
        throw new Error('El servidor no devolvió el ID de la conversación.');
      }

      const detailResponse: any =
        await prodevService.getAiConversation(created.id);

      setActiveConversation(
        unwrap<AiConversationDetail>(detailResponse),
      );

      await loadConversations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const selectedAgentInfo = agents.find(
    (agent) => agent.id === selectedAgent,
  );

  const muted = isLight ? 'text-slate-500' : 'text-slate-400';

  if (loading) {
    return (
      <div className={`${cardClass} rounded-2xl p-8 flex items-center justify-center gap-3`}>
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className={`text-sm ${muted}`}>Cargando asistente...</span>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className={`${cardClass} rounded-2xl p-5`}>
        <div className="flex items-start gap-3 text-red-500 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className={`${cardClass} rounded-2xl p-6 text-center`}>
        <Bot className="w-8 h-8 mx-auto mb-3 text-blue-500" />
        <p className="font-semibold text-sm">No hay agentes disponibles</p>
        <p className={`text-xs mt-2 ${muted}`}>
          No hay asistentes IA habilitados para tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            Asistente IA
          </h2>
          <p className={`text-xs mt-1 ${muted}`}>
            Conversa con los asistentes de ProDev Hub.
          </p>
        </div>

        <button
          type="button"
          onClick={createConversation}
          disabled={!selectedAgent || creating}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2.5 text-xs font-semibold text-white transition"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Nuevo chat
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500">
          {error}
        </div>
      )}

      <div className={`${cardClass} rounded-2xl p-3 space-y-3`}>
        <label className="text-xs font-semibold block">
          Seleccionar asistente
        </label>

        <select
          value={selectedAgent}
          onChange={(event) => {
            setSelectedAgent(event.target.value);
            setActiveConversation(null);
          }}
          className={`w-full rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        {selectedAgentInfo?.welcomeMessage && (
          <p className={`text-xs ${muted}`}>
            {selectedAgentInfo.welcomeMessage}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className={`${cardClass} rounded-2xl p-3`}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold">Conversaciones recientes</h3>
          </div>

          {conversations.length === 0 ? (
            <p className={`text-xs py-2 ${muted}`}>
              Todavía no tienes conversaciones.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openConversation(conversation.id)}
                  className={`shrink-0 max-w-[190px] text-left rounded-xl border px-3 py-2 text-xs transition ${
                    activeConversation?.id === conversation.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : isLight
                        ? 'border-slate-200 hover:bg-slate-100'
                        : 'border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="block font-semibold truncate">
                    {conversation.title || 'Conversación'}
                  </span>
                  <span className={`block truncate mt-1 ${muted}`}>
                    {typeof conversation.lastMessage === 'string'
                      ? conversation.lastMessage
                      : conversation.lastMessage?.content || 'Abrir chat'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`${cardClass} rounded-2xl p-4`}>
          {loadingChat ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className={`text-xs ${muted}`}>
                Cargando conversación...
              </span>
            </div>
          ) : activeConversation ? (
            <ChatPanel
              key={activeConversation.id}
              conversationId={activeConversation.id}
              initialMessages={toUIMessages(activeConversation.messages || [])}
              welcomeMessage={selectedAgentInfo?.welcomeMessage}
              isLight={isLight}
            />
          ) : (
            <div className="text-center py-12">
              <Bot className="w-9 h-9 mx-auto mb-3 text-blue-500" />
              <p className="font-semibold text-sm">
                Comienza una conversación
              </p>
              <p className={`text-xs mt-2 ${muted}`}>
                Selecciona un asistente y pulsa Nuevo chat.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
