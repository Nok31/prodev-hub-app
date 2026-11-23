'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  FolderKanban,
  LoaderCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { ApiError } from '@/services/auth';
import { prodevService } from '@/services/prodev.service';
import type { KanbanBoardSummary } from './types';

interface Props {
  cardClass: string;
  isLight: boolean;
  onOpen: (boardId: string) => void;
}

export default function BoardList({
  cardClass,
  isLight,
  onOpen,
}: Props) {
  const [boards, setBoards] = useState<KanbanBoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await prodevService.getKanbanBoards() as {
        data?: KanbanBoardSummary[];
      };

      setBoards(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No fue posible cargar los tableros.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const mutedText = isLight ? 'text-gray-500' : 'text-gray-400';
  const titleText = isLight ? 'text-gray-900' : 'text-white';

  if (loading) {
    return (
      <div className={`${cardClass} flex min-h-[220px] items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-indigo-500" />
          <p className={mutedText}>Cargando tableros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${cardClass} flex min-h-[220px] flex-col items-center justify-center gap-4 p-6 text-center`}>
        <AlertCircle className="h-9 w-9 text-red-500" />
        <div>
          <h3 className={`font-semibold ${titleText}`}>
            No se pudieron cargar los tableros
          </h3>
          <p className={`mt-1 text-sm ${mutedText}`}>{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadBoards()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className={`${cardClass} flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center`}>
        <FolderKanban className={`h-10 w-10 ${mutedText}`} />
        <div>
          <h3 className={`font-semibold ${titleText}`}>
            No hay tableros disponibles
          </h3>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Cuando tengas acceso a un tablero, aparecerá aquí.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBoards()}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            isLight
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-white/10 text-gray-200 hover:bg-white/15'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${titleText}`}>
            Mis tableros
          </h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            {boards.length} {boards.length === 1 ? 'tablero disponible' : 'tableros disponibles'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadBoards()}
          title="Actualizar tableros"
          className={`rounded-xl p-2 ${
            isLight
              ? 'text-gray-500 hover:bg-gray-100'
              : 'text-gray-400 hover:bg-white/10'
          }`}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {boards.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() => onOpen(board.id)}
            className={`${cardClass} group overflow-hidden p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div
              className="mb-4 h-2 w-full rounded-full"
              style={{ backgroundColor: board.color || '#4F46E5' }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className={`truncate font-semibold ${titleText}`}>
                  {board.name}
                </h3>

                {board.description && (
                  <p className={`mt-1 line-clamp-2 text-sm ${mutedText}`}>
                    {board.description}
                  </p>
                )}
              </div>

              <ArrowRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${
                isLight ? 'text-gray-400' : 'text-gray-500'
              }`} />
            </div>

            <div className={`mt-5 flex items-center gap-4 text-xs ${mutedText}`}>
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban className="h-4 w-4" />
                {board.listCount} columnas
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {board.memberCount} miembros
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
