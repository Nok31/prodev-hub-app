'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Send,
  Users,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ApiError } from '@/services/auth';
import { prodevService } from '@/services/prodev.service';
import type { KanbanCardDetail } from './types';

interface Props {
  cardId: string;
  cardClass: string;
  isLight: boolean;
  onBack: () => void;
}

const PRIORITY_META: Record<string, { label: string; style: string }> = {
  CRITICAL: {
    label: 'Crítica',
    style: 'bg-red-500/15 text-red-500 border-red-500/30',
  },
  HIGH: {
    label: 'Alta',
    style: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  },
  MEDIUM: {
    label: 'Media',
    style: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  },
  LOW: {
    label: 'Baja',
    style: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  },
};

export default function CardDetail({
  cardId,
  cardClass,
  isLight,
  onBack,
}: Props) {
  const [card, setCard] = useState<KanbanCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await prodevService.getCardDetail(cardId) as {
        data?: KanbanCardDetail;
      } | KanbanCardDetail;

      const result = 'data' in response && response.data
        ? response.data
        : response as KanbanCardDetail;

      setCard(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo cargar la tarjeta.',
      );
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  const handleComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = comment.trim();
    if (!content || sending) return;

    setSending(true);
    setCommentError(null);

    try {
      await prodevService.addCardComment(cardId, { content });
      setComment('');
      await loadCard();
    } catch (err) {
      setCommentError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo publicar el comentario.',
      );
    } finally {
      setSending(false);
    }
  };

  const muted = isLight ? 'text-gray-500' : 'text-gray-400';
  const heading = isLight ? 'text-gray-900' : 'text-white';

  const panel = isLight
    ? 'border-gray-200 bg-white'
    : 'border-gray-800 bg-[#111827]';

  if (loading && !card) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
        <LoaderCircle className="h-8 w-8 animate-spin text-sky-500" />
        <p className={`text-xs ${muted}`}>Cargando tarjeta...</p>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 text-xs font-semibold ${muted}`}
        >
          <ArrowLeft size={15} />
          Volver al tablero
        </button>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/30 p-5 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadCard()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const priority = card.priority
    ? PRIORITY_META[card.priority]
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            isLight
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-white/10 text-gray-200 hover:bg-white/15'
          }`}
        >
          <ArrowLeft size={15} />
          Volver al tablero
        </button>

        <button
          type="button"
          onClick={() => void loadCard()}
          aria-label="Actualizar tarjeta"
          className="rounded-lg border border-sky-500/30 bg-blue-600/20 p-2 text-sky-400"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <section className={`${cardClass} space-y-4 rounded-2xl p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-mono ${muted}`}>
            {card.number || 'Tarjeta'}
          </span>

          {card.isComplete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 text-[10px] font-semibold text-green-500">
              <CheckCircle2 size={11} />
              Completada
            </span>
          )}
        </div>

        <h2 className={`text-lg font-extrabold leading-snug ${heading}`}>
          {card.title}
        </h2>

        <div className={`flex flex-wrap items-center gap-2 text-[10px] ${muted}`}>
          <span className="rounded-full bg-blue-500/10 px-2 py-1">
            {card.list?.name || 'Sin columna'}
          </span>

          {priority && (
            <span className={`rounded-full border px-2 py-1 font-semibold ${priority.style}`}>
              Prioridad {priority.label.toLowerCase()}
            </span>
          )}

          {card.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {new Date(card.dueDate).toLocaleDateString('es-CL')}
            </span>
          )}
        </div>

        <div className={`border-t pt-4 ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
          <h3 className={`mb-2 flex items-center gap-2 text-xs font-bold ${heading}`}>
            <FileText size={14} />
            Descripción
          </h3>

          <p className={`whitespace-pre-wrap text-xs leading-relaxed ${muted}`}>
            {card.description || 'Esta tarjeta no tiene descripción.'}
          </p>
        </div>

        {card.labels.length > 0 && (
          <div>
            <h3 className={`mb-2 text-xs font-bold ${heading}`}>Etiquetas</h3>
            <div className="flex flex-wrap gap-2">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                  style={{
                    backgroundColor: label.color
                      ? `${label.color}25`
                      : isLight ? '#e5e7eb' : '#374151',
                    color: label.color || (isLight ? '#374151' : '#d1d5db'),
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {card.members.length > 0 && (
          <div>
            <h3 className={`mb-2 flex items-center gap-2 text-xs font-bold ${heading}`}>
              <Users size={14} />
              Participantes
            </h3>

            <div className="flex flex-wrap gap-2">
              {card.members.map((member) => (
                <span
                  key={member.id}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${panel} ${muted}`}
                >
                  {member.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={`flex flex-wrap gap-4 border-t pt-3 text-[10px] ${muted} ${
          isLight ? 'border-gray-200' : 'border-gray-800'
        }`}>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} />
            {card.checklists.length} listas de verificación
          </span>

          <span className="flex items-center gap-1">
            <Paperclip size={12} />
            {card.attachments.length} archivos
          </span>
        </div>
      </section>

      <section className={`${cardClass} space-y-3 rounded-2xl p-4`}>
        <h3 className={`flex items-center gap-2 text-sm font-bold ${heading}`}>
          <MessageSquare size={15} />
          Comentarios ({card.comments.length})
        </h3>

        {card.comments.length === 0 ? (
          <p className={`py-3 text-center text-xs ${muted}`}>
            Todavía no hay comentarios.
          </p>
        ) : (
          <div className="space-y-3">
            {card.comments.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${panel}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold ${heading}`}>
                    {item.author.name}
                  </span>
                  <span className={`text-[9px] ${muted}`}>
                    {new Date(item.createdAt).toLocaleString('es-CL')}
                  </span>
                </div>

                <p className={`whitespace-pre-wrap text-xs leading-relaxed ${muted}`}>
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleComment} className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
            maxLength={5000}
            disabled={sending}
            className={`w-full resize-y rounded-xl border p-3 text-xs outline-none focus:border-sky-500 ${
              isLight
                ? 'border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400'
                : 'border-gray-700 bg-[#0B1220] text-white placeholder:text-gray-500'
            }`}
          />

          {commentError && (
            <p className="text-[11px] text-red-400">{commentError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!comment.trim() || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-gray-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending ? 'Publicando...' : 'Comentar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
