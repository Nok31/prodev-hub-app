'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Users,
} from 'lucide-react';
import { ApiError } from '@/services/auth';
import { prodevService } from '@/services/prodev.service';
import type { KanbanBoard, KanbanCard } from './types';

interface Props {
  boardId: string;
  cardClass: string;
  isLight: boolean;
  onBack: () => void;
  onOpenCard: (cardId: string) => void;
}

export default function BoardDetail({
  boardId,
  cardClass,
  isLight,
  onBack,
  onOpenCard,
}: Props) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await prodevService.getKanbanBoardById(boardId) as {
        data?: KanbanBoard;
      } | KanbanBoard;

      const result = 'data' in response && response.data
        ? response.data
        : response as KanbanBoard;

      setBoard(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo cargar el tablero.',
      );
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const muted = isLight ? 'text-gray-500' : 'text-gray-400';
  const heading = isLight ? 'text-gray-900' : 'text-white';

  const priorityStyle: Record<string, string> = {
    LOW: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    MEDIUM: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    HIGH: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    CRITICAL: 'bg-red-500/15 text-red-500 border-red-500/30',
  };

  const renderCard = (card: KanbanCard) => (
    <button
      key={card.id}
      type="button"
      onClick={() => onOpenCard(card.id)}
      className={`${cardClass} w-full rounded-xl p-3 text-left space-y-2 transition active:scale-[0.99] hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-mono ${muted}`}>
          {card.number || 'Tarjeta'}
        </span>

        {card.isComplete && (
          <CheckCircle2 size={14} className="shrink-0 text-green-500" />
        )}
      </div>

      <p className={`text-[12px] font-semibold leading-snug ${heading} line-clamp-3`}>
        {card.title}
      </p>

      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium"
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
      )}

      {card.priority && (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
          priorityStyle[card.priority] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        }`}>
          {card.priority}
        </span>
      )}

      <div className={`flex flex-wrap items-center gap-3 text-[10px] ${muted}`}>
        {card.dueDate && (
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {new Date(card.dueDate).toLocaleDateString('es-CL')}
          </span>
        )}

        {card.commentCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {card.commentCount}
          </span>
        )}

        {card.attachmentCount > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip size={11} />
            {card.attachmentCount}
          </span>
        )}

        {card.checklistCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} />
            {card.checklistCount}
          </span>
        )}

        {card.members.length > 0 && (
          <span className="flex items-center gap-1">
            <Users size={11} />
            {card.members.length}
          </span>
        )}
      </div>
    </button>
  );

  const sortedLists = board
    ? [...board.lists].sort((a, b) => a.position - b.position)
    : [];

  const selectedList =
    sortedLists.find((list) => list.id === selectedListId) ||
    sortedLists[0] ||
    null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            isLight
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-white/10 text-gray-200 hover:bg-white/15'
          }`}
        >
          <ArrowLeft size={15} />
          Volver
        </button>

        <button
          type="button"
          onClick={() => void loadBoard()}
          aria-label="Actualizar tablero"
          className="rounded-lg border border-sky-500/30 bg-blue-600/20 p-2 text-sky-400 hover:bg-blue-600/30"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !board && (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-sky-500" />
          <p className={`text-xs ${muted}`}>Cargando tablero...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/30 p-5 text-center">
          <p className="text-xs text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadBoard()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {board && (
        <>
          <div className={`${cardClass} rounded-2xl p-4`}>
            <div className="flex items-start gap-3">
              <div
                className="mt-1 h-9 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: board.color || '#0EA5E9' }}
              />

              <div className="min-w-0 flex-1">
                <h2 className={`text-lg font-extrabold tracking-tight ${heading}`}>
                  {board.name}
                </h2>

                {board.description && (
                  <p className={`mt-1 text-xs ${muted}`}>
                    {board.description}
                  </p>
                )}

                <div className={`mt-3 flex flex-wrap items-center gap-3 text-[10px] ${muted}`}>
                  <span className="flex items-center gap-1">
                    <FolderKanban size={12} />
                    {board.lists.length} columnas
                  </span>

                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {board.memberCount} miembros
                  </span>

                  {!board.access.canEdit && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 font-semibold text-amber-500">
                      Solo lectura
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {sortedLists.length === 0 ? (
            <p className={`py-10 text-center text-xs ${muted}`}>
              Este tablero todavía no tiene columnas.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sortedLists.map((list) => {
                  const isSelected = selectedList?.id === list.id;

                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => setSelectedListId(list.id)}
                      aria-pressed={isSelected}
                      className={`flex min-h-[58px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/15 text-sky-500 shadow-sm'
                          : isLight
                            ? 'border-gray-200 bg-white text-gray-600 hover:border-sky-300'
                            : 'border-gray-800 bg-[#111827] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="min-w-0 text-[11px] font-bold leading-tight">
                        {list.name}
                      </span>

                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-500'
                          : isLight
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-gray-800 text-gray-400'
                      }`}>
                        {list.cards.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedList && (
                <section
                  className={`rounded-xl border p-3 ${
                    isLight
                      ? 'border-gray-200 bg-gray-100/80'
                      : 'border-gray-800 bg-[#111827]/80'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-bold ${heading}`}>
                      {selectedList.name}
                    </h3>

                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      isLight
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {selectedList.cards.length} tarjetas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedList.cards.length > 0 ? (
                      [...selectedList.cards]
                        .sort((a, b) => a.position - b.position)
                        .map(renderCard)
                    ) : (
                      <p className={`py-8 text-center text-xs ${muted}`}>
                        No hay tarjetas en esta columna.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
