'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { prodevService, type TicketStatus } from '@/services/prodev.service';
import type { Adjunto, TicketDetalle } from './types';
import FilePicker from './FilePicker';
import { useUploadCache } from './useUploadCache';
import {
  PRIORITY_META, STATUS_META, STATUS_ORDER, errMsg, formatBytes, formatDate, initialsOf, inputClass,
} from './constants';

interface Props {
  ticketId: string;
  cardClass: string;
  isLight: boolean;
  onBack: () => void;
  /** Avisar a la lista que algo cambió (estado, comentarios). */
  onChanged: () => void;
}

const SIGNED_URL_REFRESH_MS = 8 * 60 * 1000;

function Attachments({ items, onImgError }: { items: Adjunto[]; onImgError: () => void }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) =>
        a.mimeType?.startsWith('image/') ? (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" title={a.fileName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={a.fileName} onError={onImgError} className="h-20 w-20 object-cover rounded-lg border border-gray-500/30" />
          </a>
        ) : (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-500/30 hover:bg-gray-500/10 max-w-full"
          >
            <FileText size={13} className="shrink-0" />
            <span className="truncate">{a.fileName}</span>
            <span className="opacity-50 shrink-0">{formatBytes(a.fileSize)}</span>
          </a>
        ),
      )}
    </div>
  );
}

export default function TicketDetail({ ticketId, cardClass, isLight, onBack, onChanged }: Props) {
  const [ticket, setTicket] = useState<TicketDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const { uploadAll, clear } = useUploadCache();
  const lastImgReload = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const t = (await prodevService.getTicketById(ticketId)) as TicketDetalle;
      setTicket(t);
    } catch (e) {
      if (!silent) setError(errMsg(e, 'No se pudo cargar el ticket.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setTicket(null);
    load();
    const interval = setInterval(() => load(true), SIGNED_URL_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const handleImgError = useCallback(() => {
    if (Date.now() - lastImgReload.current > 30_000) {
      lastImgReload.current = Date.now();
      load(true);
    }
  }, [load]);

  const changeStatus = async (next: TicketStatus) => {
    if (!ticket || next === ticket.status || changingStatus) return;
    if ((next === 'CLOSED' || next === 'CANCELLED') && !window.confirm(`¿Cambiar el estado a «${STATUS_META[next].label}»?`)) return;
    setChangingStatus(true);
    setStatusError(null);
    try {
      const res = await prodevService.updateTicketStatus(ticket.id, next);
      setTicket((t) => (t ? { ...t, status: res.status, resolvedAt: res.resolvedAt, closedAt: res.closedAt, updatedAt: res.updatedAt } : t));
      setStatusOpen(false);
      onChanged();
      load(true);
    } catch (e) {
      setStatusError(errMsg(e, 'No se pudo cambiar el estado.'));
    } finally {
      setChangingStatus(false);
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || sending || !comment.trim()) return;
    setSending(true);
    setCommentError(null);
    try {
      const attachments = commentFiles.length ? await uploadAll(commentFiles) : undefined;
      await prodevService.addTicketComment(ticket.id, {
        content: comment.trim(),
        isInternal: isInternal || undefined,
        attachments,
      });
      setComment('');
      setIsInternal(false);
      setCommentFiles([]);
      clear();
      await load(true);
      onChanged();
    } catch (err) {
      // auth.ts no exporta ApiError; comprobamos el código sin depender de esa clase.
      const errorCode = (err as { code?: string } | null)?.code;
      if (errorCode === 'INVALID_UPLOAD_REF') {
        clear();
        setCommentError('Los archivos adjuntos expiraron. Vuelve a enviar para subirlos de nuevo.');
      } else {
        setCommentError(errMsg(err, 'No se pudo enviar el comentario.'));
      }
    } finally {
      setSending(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <button onClick={onBack} aria-label="Volver" className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-500/10"><ArrowLeft size={18} /></button>
      <h2 className="text-lg font-extrabold tracking-tight">{ticket?.number ?? 'Ticket'}</h2>
    </div>
  );

  if (loading && !ticket) {
    return <div className="space-y-4">{header}<p className="text-[11px] opacity-50 text-center py-10 animate-pulse">Cargando ticket…</p></div>;
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        {header}
        <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded-xl flex items-center justify-between gap-2">
          <span>{error ?? 'No se encontró el ticket.'}</span>
          <button onClick={() => load()} className="underline shrink-0">Reintentar</button>
        </div>
      </div>
    );
  }

  const info: [string, string][] = [
    ['Solicitante', ticket.reporter?.name ?? '—'],
    ['Asignado a', ticket.assignee?.name ?? 'Sin asignar'],
    ['Categoría', ticket.category?.name ?? '—'],
    ['Proyecto', ticket.project?.name ?? '—'],
    ['Origen', ticket.source ?? '—'],
    ['Creado', formatDate(ticket.createdAt)],
    ['Actualizado', formatDate(ticket.updatedAt)],
    ['Resuelto', formatDate(ticket.resolvedAt)],
  ];

  const sla = ticket.sla;
  const slaRow = (label: string, due: string | null, met: boolean | null) => (
    <div className="flex items-center justify-between text-[11px]">
      <span className="opacity-70">{label}</span>
      <span>
        {formatDate(due)}{' '}
        {met === true && <span className="text-emerald-500">· cumplido</span>}
        {met === false && <span className="text-red-500">· incumplido</span>}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      <div className={`${cardClass} p-4 rounded-2xl space-y-3`}>
        <p className="text-[15px] font-bold leading-snug">{ticket.title}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_META[ticket.status]?.badge ?? ''}`}>{STATUS_META[ticket.status]?.label ?? ticket.status}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_META[ticket.priority]?.badge ?? ''}`}>{PRIORITY_META[ticket.priority]?.label ?? ticket.priority}</span>
        </div>

        <button
          onClick={() => setStatusOpen((o) => !o)}
          className="text-[11px] text-sky-400 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg transition"
        >
          {statusOpen ? 'Cancelar cambio de estado' : 'Cambiar estado'}
        </button>

        {statusOpen && (
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                disabled={changingStatus || s === ticket.status}
                onClick={() => changeStatus(s)}
                className={`text-[11px] py-2 rounded-lg border transition disabled:opacity-40 ${STATUS_META[s].badge}`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        )}
        {statusError && <p className="text-[11px] text-red-400">{statusError}</p>}
      </div>

      {ticket.description && (
        <div className={`${cardClass} p-4 rounded-2xl space-y-2`}>
          <h3 className="text-[11px] font-bold opacity-80 tracking-wider uppercase">Descripción</h3>
          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{ticket.description}</p>
        </div>
      )}

      <div className={`${cardClass} p-4 rounded-2xl space-y-2`}>
        <h3 className="text-[11px] font-bold opacity-80 tracking-wider uppercase">Detalles</h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] opacity-50">{k}</dt>
              <dd className="text-[11px] break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {sla && (sla.responseDue || sla.resolutionDue) && (
        <div className={`${cardClass} p-4 rounded-2xl space-y-2`}>
          <h3 className="text-[11px] font-bold opacity-80 tracking-wider uppercase">SLA</h3>
          {slaRow('Primera respuesta', sla.responseDue, sla.responseMet)}
          {slaRow('Resolución', sla.resolutionDue, sla.resolutionMet)}
        </div>
      )}

      {ticket.attachments?.length > 0 && (
        <div className={`${cardClass} p-4 rounded-2xl space-y-2`}>
          <h3 className="text-[11px] font-bold opacity-80 tracking-wider uppercase">Adjuntos ({ticket.attachments.length})</h3>
          <Attachments items={ticket.attachments} onImgError={handleImgError} />
        </div>
      )}

      {/* Comentarios */}
      <div className={`${cardClass} p-4 rounded-2xl space-y-3`}>
        <h3 className="text-[11px] font-bold opacity-80 tracking-wider uppercase">Comentarios ({ticket.comments?.length ?? 0})</h3>

        {(ticket.comments ?? []).length === 0 && <p className="text-[11px] opacity-50 text-center py-3">Aún no hay comentarios.</p>}

        <div className="space-y-3">
          {(ticket.comments ?? []).map((c) => (
            <div key={c.id} className={`flex gap-2.5 ${c.isInternal ? 'bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                {initialsOf(c.author?.name)}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 text-[10px]">
                  <strong className="text-[11px] font-semibold">{c.author?.name ?? 'Usuario'}</strong>
                  <span className="opacity-50">{formatDate(c.createdAt)}{c.editedAt ? ' · editado' : ''}</span>
                  {c.isInternal && <span className="text-amber-500">Nota interna</span>}
                </div>
                {c.isDeleted ? (
                  <p className="text-[11px] italic opacity-50">Comentario eliminado</p>
                ) : (
                  <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
                )}
                {!c.isDeleted && <Attachments items={c.attachments} onImgError={handleImgError} />}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={sendComment} className="space-y-2.5 pt-2 border-t border-gray-500/20">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Escribe un comentario… (usa @alias para mencionar)"
            className={inputClass(isLight)}
          />
          <FilePicker files={commentFiles} onChange={setCommentFiles} isLight={isLight} disabled={sending} />
          <label className="flex items-center gap-2 text-[11px] opacity-80">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Nota interna
          </label>
          {commentError && <p className="text-[11px] text-red-400">{commentError}</p>}
          <button
            type="submit"
            disabled={sending || !comment.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-sky-400 hover:bg-sky-300 text-gray-950 font-semibold text-xs rounded-xl transition disabled:opacity-50"
          >
            <Send size={13} /> {sending ? 'Enviando…' : 'Enviar comentario'}
          </button>
        </form>
      </div>
    </div>
  );
}
