'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MessageSquare, Paperclip, Plus, RefreshCw, Search } from 'lucide-react';
import { prodevService, type TicketPriority, type TicketStatus } from '@/services/prodev.service';
import type { TicketResumen } from './types';
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER, errMsg, formatDate, inputClass } from './constants';

interface Props {
  cardClass: string;
  isLight: boolean;
  version: number;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

interface ReporterOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;
const FETCH_SIZE = 100;

async function fetchAllTickets(search?: string): Promise<TicketResumen[]> {
  const first = await prodevService.getTickets({
    search: search || undefined,
    page: 1,
    pageSize: FETCH_SIZE,
  });

  const rows = [...(first.data ?? [])] as TicketResumen[];
  const totalPages = first.pagination?.totalPages ?? 1;

  for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
    const res = await prodevService.getTickets({
      search: search || undefined,
      page: currentPage,
      pageSize: FETCH_SIZE,
    });

    rows.push(...((res.data ?? []) as TicketResumen[]));
  }

  return rows;
}

export default function TicketList({ cardClass, isLight, version, onOpen, onCreate }: Props) {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [reporters, setReporters] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [allItems, setAllItems] = useState<TicketResumen[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      const clickedDetails =
        target instanceof Element ? target.closest('details') : null;

      filtersRef.current?.querySelectorAll('details[open]').forEach((menu) => {
        if (menu !== clickedDetails) {
          menu.removeAttribute('open');
        }
      });
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchAllTickets(search);

      if (id !== requestId.current) return;
      setAllItems(rows);
      setPage(1);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(errMsg(e, 'No se pudieron cargar los tickets.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
    return () => {
      requestId.current++;
    };
  }, [load, version]);

  const reporterOptions = useMemo(() => {
    const unique = new Map<string, ReporterOption>();

    allItems.forEach((ticket) => {
      const person = ticket.reporter;
      if (person?.id && person.name) {
        unique.set(person.id, { id: person.id, name: person.name });
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((ticket) => {
      const matchesStatus =
        statuses.length === 0 || statuses.includes(ticket.status);

      const matchesPriority =
        priorities.length === 0 || priorities.includes(ticket.priority);

      const matchesReporter =
        reporters.length === 0 ||
        (ticket.reporter?.id != null && reporters.includes(ticket.reporter.id));

      return matchesStatus && matchesPriority && matchesReporter;
    });
  }, [allItems, statuses, priorities, reporters]);

  const visibleItems = filteredItems.slice(0, page * PAGE_SIZE);
  const hasMore = visibleItems.length < filteredItems.length;

  const toggleStatus = (value: TicketStatus) => {
    setStatuses((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const togglePriority = (value: TicketPriority) => {
    setPriorities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleReporter = (value: string) => {
    setReporters((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const filterClass = `flex w-full items-center justify-between gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition ${
    isLight
      ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      : 'bg-[#111827] border-gray-800 text-gray-200 hover:bg-gray-800'
  }`;

  const dropdownClass = `absolute left-0 top-full z-30 mt-1 max-h-64 w-56 max-w-[85vw] overflow-y-auto rounded-xl border p-2 shadow-xl backdrop-blur-xl ${
    isLight
      ? 'bg-white/35 border-sky-300/80 text-gray-800'
      : 'bg-[#111827]/45 border-sky-400/70 text-gray-100'
  }`;

  const optionClass = 'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-sky-500/10';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Tickets</h2>
          <p className="text-[11px] opacity-70 mt-0.5">
            {loading && allItems.length === 0
              ? 'Cargando…'
              : `${filteredItems.length} ticket(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            aria-label="Actualizar"
            disabled={loading}
            className="p-2 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 text-sky-400 border border-sky-500/30 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onCreate}
            className="flex items-center gap-1 text-[11px] font-semibold bg-sky-400 hover:bg-sky-300 text-gray-950 px-3 py-2 rounded-lg transition"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por título o número…"
          className={`${inputClass(isLight)} pl-9`}
        />
      </div>

      {/* Filtros de selección múltiple */}
      <div ref={filtersRef} className="grid grid-cols-3 gap-2">
        <details className="relative min-w-0">
          <summary className={`${filterClass} list-none cursor-pointer`}>
            <span className="truncate">
              Estado{statuses.length > 0 ? ` (${statuses.length})` : ''}
            </span>
            <ChevronDown size={13} className="shrink-0 opacity-60" />
          </summary>

          <div className={dropdownClass}>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[11px] font-bold">Estado</span>
              <button
                type="button"
                onClick={() => { setStatuses([]); setPage(1); }}
                className="text-[10px] text-sky-500 hover:underline"
              >
                Limpiar
              </button>
            </div>

            {STATUS_ORDER.map((value) => (
              <label key={value} className={optionClass}>
                <input
                  type="checkbox"
                  checked={statuses.includes(value)}
                  onChange={() => toggleStatus(value)}
                  className="accent-sky-500"
                />
                <span>{STATUS_META[value].label}</span>
              </label>
            ))}
          </div>
        </details>

        <details className="relative min-w-0">
          <summary className={`${filterClass} list-none cursor-pointer`}>
            <span className="truncate">
              Prioridad{priorities.length > 0 ? ` (${priorities.length})` : ''}
            </span>
            <ChevronDown size={13} className="shrink-0 opacity-60" />
          </summary>

          <div className={dropdownClass}>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[11px] font-bold">Prioridad</span>
              <button
                type="button"
                onClick={() => { setPriorities([]); setPage(1); }}
                className="text-[10px] text-sky-500 hover:underline"
              >
                Limpiar
              </button>
            </div>

            {PRIORITY_ORDER.map((value) => (
              <label key={value} className={optionClass}>
                <input
                  type="checkbox"
                  checked={priorities.includes(value)}
                  onChange={() => togglePriority(value)}
                  className="accent-sky-500"
                />
                <span>{PRIORITY_META[value].label}</span>
              </label>
            ))}
          </div>
        </details>

        <details className="relative min-w-0">
          <summary className={`${filterClass} list-none cursor-pointer`}>
            <span className="truncate">
              Reportante{reporters.length > 0 ? ` (${reporters.length})` : ''}
            </span>
            <ChevronDown size={13} className="shrink-0 opacity-60" />
          </summary>

          <div className={`${dropdownClass} left-auto right-0`}>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[11px] font-bold">Reportante</span>
              <button
                type="button"
                onClick={() => { setReporters([]); setPage(1); }}
                className="text-[10px] text-sky-500 hover:underline"
              >
                Limpiar
              </button>
            </div>

            {reporterOptions.length === 0 ? (
              <p className="px-2 py-3 text-[11px] opacity-60">
                {loading ? 'Cargando reportantes…' : 'No hay reportantes disponibles.'}
              </p>
            ) : (
              reporterOptions.map((person) => (
                <label key={person.id} className={optionClass}>
                  <input
                    type="checkbox"
                    checked={reporters.includes(person.id)}
                    onChange={() => toggleReporter(person.id)}
                    className="accent-sky-500"
                  />
                  <span className="truncate">{person.name}</span>
                </label>
              ))
            )}
          </div>
        </details>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded-xl flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="underline shrink-0">Reintentar</button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {!loading && !error && visibleItems.length === 0 && (
          <p className="text-[11px] opacity-50 text-center py-8">
            No hay tickets con estos filtros.
          </p>
        )}

        {visibleItems.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className={`${cardClass} w-full text-left p-3.5 rounded-2xl space-y-2 active:scale-[0.99] transition`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono opacity-60">{t.number}</span>
              <span className="text-[10px] opacity-50">{formatDate(t.createdAt)}</span>
            </div>

            <p className="text-[13px] font-semibold leading-snug line-clamp-2">{t.title}</p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_META[t.status]?.badge ?? ''}`}>
                {STATUS_META[t.status]?.label ?? t.status}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_META[t.priority]?.badge ?? ''}`}>
                {PRIORITY_META[t.priority]?.label ?? t.priority}
              </span>
              {t.category?.name && (
                <span className="text-[10px] opacity-60">{t.category.name}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] opacity-60">
              <span className="truncate">
                {t.assignee?.name ? `Asignado a ${t.assignee.name}` : 'Sin asignar'}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} />{t.commentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Paperclip size={11} />{t.attachmentCount}
                </span>
              </span>
            </div>
          </button>
        ))}

        {loading && allItems.length === 0 && !error && (
          <p className="text-[11px] opacity-50 text-center py-8 animate-pulse">
            Cargando tickets…
          </p>
        )}

        {hasMore && (
          <button
            onClick={() => setPage((current) => current + 1)}
            className="w-full text-[11px] py-2.5 rounded-xl border border-sky-500/30 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition"
          >
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
}
