'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Clock3,
  Download,
  Loader2,
  RefreshCw,
  Ticket,
  CheckCircle2,
  CircleDot,
  Users,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { ApiError } from '@/services/auth';
import { prodevService } from '@/services/prodev.service';
import type {
  KanbanBoard,
  KanbanBoardSummary,
} from '@/components/kanban/types';

interface ReportsModuleProps {
  cardClass: string;
  isLight: boolean;
  onForbidden?: () => void;
}

interface DistributionItem {
  status?: string;
  priority?: string;
  count: number;
  percent: number;
}

interface ReportSummary {
  total: number;
  byStatus: DistributionItem[];
  byPriority: DistributionItem[];
}

interface ResolutionItem {
  priority: string;
  resolvedCount: number;
  avgResolutionHours: number | null;
}

interface DashboardMetrics {
  open: number;
  inProgress: number;
  waiting: number;
  resolvedToday: number;
  total: number;
}

interface TicketReference {
  id: string;
  status?: string;
  priority?: string;
  source?: string | null;
  createdAt?: string;
  assignee?: { id?: string; name?: string } | null;
}

interface PaginatedTickets {
  data?: TicketReference[];
  pagination?: {
    totalPages?: number;
  };
}

interface TicketDetail extends TicketReference {
  createdAt?: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  firstResponseAt?: string | null;
  sla?: {
    responseMet?: boolean | null;
    resolutionMet?: boolean | null;
  } | null;
}

interface ResolutionAverage {
  hours: number | null;
  count: number;
}

interface TrendItem {
  date: string;
  created: number;
  resolved: number;
}

interface AgentItem {
  name: string;
  total: number;
  resolved: number;
}

interface SourceItem {
  source: string;
  count: number;
}

interface SlaMetrics {
  responseMet: number;
  responseTotal: number;
  resolutionMet: number;
  resolutionTotal: number;
}

interface BoardReport {
  id: string;
  name: string;
  total: number;
  completed: number;
  pending: number;
  progress: number;
}

function unwrap<T>(value: any): T {
  return (value?.data ?? value) as T;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return localDate(date);
}

function labelStatus(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En progreso',
    WAITING_CUSTOMER: 'Esperando cliente',
    WAITING_THIRD_PARTY: 'Esperando tercero',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}

function labelPriority(priority: string): string {
  const labels: Record<string, string> = {
    CRITICAL: 'Crítica',
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
  };
  return labels[priority] ?? priority;
}

function labelSource(source: string): string {
  const labels: Record<string, string> = {
    WEB: 'Web',
    AI_ASSISTANT: 'Asistente IA',
    MOBILE: 'Móvil',
    EMAIL: 'Correo',
    API: 'API',
  };
  return labels[source] ?? source.replaceAll('_', ' ');
}

function formatHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return 'Sin datos';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} días`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'No fue posible cargar los reportes.';
}

function isWithinPeriod(value: string | null | undefined, from: string, to: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const day = localDate(date);
  return day >= from && day <= to;
}

async function fetchAllTickets(): Promise<TicketReference[]> {
  const tickets: TicketReference[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await prodevService.getTickets({
      page,
      pageSize: 100,
    }) as PaginatedTickets;

    const rows = Array.isArray(response?.data) ? response.data : [];
    tickets.push(...rows);
    totalPages = Math.min(response?.pagination?.totalPages ?? 1, 20);
    page += 1;
  } while (page <= totalPages);

  return tickets;
}

async function fetchTicketDetails(
  tickets: TicketReference[],
): Promise<TicketDetail[]> {
  const details: TicketDetail[] = [];

  for (let index = 0; index < tickets.length; index += 5) {
    const batch = tickets.slice(index, index + 5);

    const results = await Promise.all(
      batch.map(async (ticket) => {
        try {
          const response = await prodevService.getTicketById(ticket.id);
          return unwrap<TicketDetail>(response);
        } catch {
          return null;
        }
      }),
    );

    details.push(
      ...results.filter((item): item is TicketDetail => item !== null),
    );
  }

  return details;
}

async function fetchBoardReports(): Promise<BoardReport[]> {
  const response = await prodevService.getKanbanBoards() as {
    data?: KanbanBoardSummary[];
  };

  const boards = Array.isArray(response?.data) ? response.data : [];
  const reports: BoardReport[] = [];

  for (let index = 0; index < boards.length; index += 5) {
    const batch = boards.slice(index, index + 5);

    const results = await Promise.all(
      batch.map(async (board) => {
        try {
          const boardResponse = await prodevService.getKanbanBoardById(board.id);
          const detail = unwrap<KanbanBoard>(boardResponse);
          const cards = (detail.lists ?? []).flatMap((list) => list.cards ?? []);
          const completed = cards.filter((card) => card.isComplete).length;
          const total = cards.length;

          return {
            id: board.id,
            name: board.name,
            total,
            completed,
            pending: total - completed,
            progress: total ? (completed / total) * 100 : 0,
          };
        } catch {
          return null;
        }
      }),
    );

    reports.push(
      ...results.filter((item): item is BoardReport => item !== null),
    );
  }

  return reports;
}

function buildTrend(
  details: TicketDetail[],
  from: string,
  to: string,
): TrendItem[] {
  const days: TrendItem[] = [];
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return days;
  }

  const cursor = new Date(start);

  while (cursor <= end && days.length < 93) {
    const date = localDate(cursor);
    days.push({ date, created: 0, resolved: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const indexByDate = new Map(days.map((item, index) => [item.date, index]));

  details.forEach((ticket) => {
    if (ticket.createdAt) {
      const createdDate = localDate(new Date(ticket.createdAt));
      const index = indexByDate.get(createdDate);
      if (index !== undefined) days[index].created += 1;
    }

    const resolvedAt = ticket.resolvedAt ?? ticket.closedAt;
    if (resolvedAt) {
      const resolvedDate = localDate(new Date(resolvedAt));
      const index = indexByDate.get(resolvedDate);
      if (index !== undefined) days[index].resolved += 1;
    }
  });

  return days;
}

function buildSources(tickets: TicketReference[]): SourceItem[] {
  const counts = new Map<string, number>();

  tickets.forEach((ticket) => {
    const source = ticket.source || 'UNKNOWN';
    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  return Array.from(counts, ([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

function buildAgents(details: TicketDetail[]): AgentItem[] {
  const agents = new Map<string, AgentItem>();

  details.forEach((ticket) => {
    const name = ticket.assignee?.name || 'Sin asignar';
    const current = agents.get(name) ?? { name, total: 0, resolved: 0 };
    current.total += 1;

    if (ticket.resolvedAt || ticket.closedAt || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      current.resolved += 1;
    }

    agents.set(name, current);
  });

  return Array.from(agents.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

function buildSla(details: TicketDetail[]): SlaMetrics {
  const result: SlaMetrics = {
    responseMet: 0,
    responseTotal: 0,
    resolutionMet: 0,
    resolutionTotal: 0,
  };

  details.forEach((ticket) => {
    if (typeof ticket.sla?.responseMet === 'boolean') {
      result.responseTotal += 1;
      if (ticket.sla.responseMet) result.responseMet += 1;
    }

    if (typeof ticket.sla?.resolutionMet === 'boolean') {
      result.resolutionTotal += 1;
      if (ticket.sla.resolutionMet) result.resolutionMet += 1;
    }
  });

  return result;
}

function downloadCsv(
  summary: ReportSummary | null,
  metrics: DashboardMetrics | null,
  resolution: ResolutionItem[],
  sources: SourceItem[],
  agents: AgentItem[],
  boards: BoardReport[],
  sla: SlaMetrics,
  from: string,
  to: string,
) {
  const rows: string[][] = [
    ['Reporte ProDev Hub', ''],
    ['Período', `${from} - ${to}`],
    [],
    ['Indicador', 'Valor'],
    ['Total de tickets', String(summary?.total ?? 0)],
    ['Tickets abiertos', String(metrics?.open ?? 0)],
    ['En progreso', String(metrics?.inProgress ?? 0)],
    ['En espera', String(metrics?.waiting ?? 0)],
    ['Resueltos hoy', String(metrics?.resolvedToday ?? 0)],
    [],
    ['Tiempos por prioridad', 'Resueltos', 'Promedio horas'],
    ...resolution.map((item) => [
      labelPriority(item.priority),
      String(item.resolvedCount),
      item.avgResolutionHours === null ? 'Sin datos' : String(item.avgResolutionHours),
    ]),
    [],
    ['Fuente', 'Tickets'],
    ...sources.map((item) => [labelSource(item.source), String(item.count)]),
    [],
    ['Agente', 'Tickets asignados', 'Resueltos'],
    ...agents.map((item) => [item.name, String(item.total), String(item.resolved)]),
    [],
    ['SLA', 'Cumplidos', 'Evaluados'],
    ['Primera respuesta', String(sla.responseMet), String(sla.responseTotal)],
    ['Resolución', String(sla.resolutionMet), String(sla.resolutionTotal)],
    [],
    ['Tablero', 'Total tarjetas', 'Completadas', 'Pendientes', 'Progreso'],
    ...boards.map((item) => [
      item.name,
      String(item.total),
      String(item.completed),
      String(item.pending),
      formatPercent(item.progress),
    ]),
  ];

  const csv = '\uFEFF' + rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-prodev-${from}-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsModule({
  cardClass,
  isLight,
  onForbidden,
}: ReportsModuleProps) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [resolution, setResolution] = useState<ResolutionItem[]>([]);
  const [overallAverage, setOverallAverage] = useState<ResolutionAverage>({
    hours: null,
    count: 0,
  });
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [sla, setSla] = useState<SlaMetrics>({
    responseMet: 0,
    responseTotal: 0,
    resolutionMet: 0,
    resolutionTotal: 0,
  });
  const [boards, setBoards] = useState<BoardReport[]>([]);
  const [dateFrom, setDateFrom] = useState(getInitialDate);
  const [dateTo, setDateTo] = useState(() => localDate(new Date()));
  const [appliedFrom, setAppliedFrom] = useState(getInitialDate);
  const [appliedTo, setAppliedTo] = useState(() => localDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setError('');
    setRefreshing(true);

    try {
      const [summaryResponse, resolutionResponse] = await Promise.all([
        prodevService.getReportSummary(),
        prodevService.getResolutionTimes({
          dateFrom: appliedFrom,
          dateTo: appliedTo,
        }),
      ]);

      const summaryData = unwrap<ReportSummary>(summaryResponse);
      const resolutionData = unwrap<ResolutionItem[]>(resolutionResponse);

      setSummary(summaryData);
      setResolution(Array.isArray(resolutionData) ? resolutionData : []);

      const [metricsResult, ticketsResult, boardsResult] = await Promise.allSettled([
        prodevService.getDashboardMetrics(),
        fetchAllTickets(),
        fetchBoardReports(),
      ]);

      const dashboard = metricsResult.status === 'fulfilled'
        ? unwrap<DashboardMetrics>(metricsResult.value)
        : null;

      setMetrics(dashboard);

      const tickets = ticketsResult.status === 'fulfilled'
        ? ticketsResult.value
        : [];

      const details = tickets.length
        ? await fetchTicketDetails(tickets)
        : [];

      const durations = details
        .map((ticket) => {
          const resolvedAt = ticket.resolvedAt ?? ticket.closedAt;
          if (!ticket.createdAt || !resolvedAt) return null;

          const created = Date.parse(ticket.createdAt);
          const resolved = Date.parse(resolvedAt);

          if (!Number.isFinite(created) || !Number.isFinite(resolved) || resolved < created) {
            return null;
          }

          return (resolved - created) / 3600000;
        })
        .filter((hours): hours is number => hours !== null);

      setOverallAverage({
        hours: durations.length
          ? durations.reduce((total, hours) => total + hours, 0) / durations.length
          : null,
        count: durations.length,
      });

      setSources(buildSources(tickets));
      setAgents(buildAgents(details));
      setTrend(buildTrend(details, appliedFrom, appliedTo));
      setSla(buildSla(details));

      setBoards(
        boardsResult.status === 'fulfilled'
          ? boardsResult.value
          : [],
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        onForbidden?.();
        setError('No tienes permisos para consultar los reportes.');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFrom, appliedTo, onForbidden]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const applyDates = () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setError('Selecciona un período válido.');
      return;
    }

    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const panelClass = `${cardClass} rounded-2xl border p-4`;
  const mutedClass = isLight ? 'text-gray-500' : 'text-gray-400';
  const headingClass = isLight ? 'text-gray-900' : 'text-white';
  const subtleClass = isLight ? 'bg-gray-100' : 'bg-white/5';

  const maxResolution = Math.max(
    1,
    ...resolution.map((item) => item.avgResolutionHours ?? 0),
  );

  const maxTrend = Math.max(
    1,
    ...trend.flatMap((item) => [item.created, item.resolved]),
  );

  const resolvedInPeriod = resolution.reduce(
    (total, item) => total + (item.resolvedCount ?? 0),
    0,
  );

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500',
    IN_PROGRESS: 'bg-indigo-500',
    WAITING_CUSTOMER: 'bg-amber-500',
    WAITING_THIRD_PARTY: 'bg-orange-500',
    RESOLVED: 'bg-emerald-500',
    CLOSED: 'bg-green-600',
    CANCELLED: 'bg-gray-500',
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-blue-500',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-extrabold tracking-tight ${headingClass}`}>
            Reportes
          </h2>
          <p className={`text-xs ${mutedClass}`}>
            Métricas y análisis de rendimiento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(
              summary,
              metrics,
              resolution,
              sources,
              agents,
              boards,
              sla,
              appliedFrom,
              appliedTo,
            )}
            disabled={loading || !summary}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
          >
            <Download size={14} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      <section className={`${panelClass} flex flex-wrap items-end gap-3`}>
        <div className="mr-auto">
          <p className={`text-sm font-bold ${headingClass}`}>Período del reporte</p>
          <p className={`text-xs ${mutedClass}`}>Filtra los tickets resueltos y la tendencia</p>
        </div>

        <label className={`flex flex-col gap-1 text-xs ${mutedClass}`}>
          Desde
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
            className={`rounded-lg border px-3 py-2 ${subtleClass} ${headingClass}`}
          />
        </label>

        <label className={`flex flex-col gap-1 text-xs ${mutedClass}`}>
          Hasta
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={localDate(new Date())}
            onChange={(event) => setDateTo(event.target.value)}
            className={`rounded-lg border px-3 py-2 ${subtleClass} ${headingClass}`}
          />
        </label>

        <button
          type="button"
          onClick={applyDates}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          Aplicar período
        </button>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className={`flex items-center justify-center gap-2 py-16 ${mutedClass}`}>
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Cargando reportes...</span>
        </div>
      ) : (
        <>
          <div>
            <h3 className={`mb-3 text-sm font-bold ${headingClass}`}>General</h3>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className={panelClass}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                    <Ticket size={21} />
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Total tickets</p>
                    <p className={`text-2xl font-extrabold ${headingClass}`}>
                      {summary?.total ?? 0}
                    </p>
                    <p className={`text-[11px] ${mutedClass}`}>Tickets en el sistema</p>
                  </div>
                </div>
              </div>

              <div className={panelClass}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
                    <CircleDot size={21} />
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Abiertos</p>
                    <p className={`text-2xl font-extrabold ${headingClass}`}>
                      {metrics?.open ?? 0}
                    </p>
                    <p className={`text-[11px] ${mutedClass}`}>Pendientes de resolución</p>
                  </div>
                </div>
              </div>

              <div className={panelClass}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500">
                    <CheckCircle2 size={21} />
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Resueltos (período)</p>
                    <p className={`text-2xl font-extrabold ${headingClass}`}>
                      {resolvedInPeriod}
                    </p>
                    <p className={`text-[11px] ${mutedClass}`}>En el período seleccionado</p>
                  </div>
                </div>
              </div>

              <div className={panelClass}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500">
                    <Clock3 size={21} />
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Tiempo promedio</p>
                    <p className={`text-2xl font-extrabold ${headingClass}`}>
                      {formatHours(overallAverage.hours)}
                    </p>
                    <p className={`text-[11px] ${mutedClass}`}>
                      {overallAverage.count} tickets considerados
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={panelClass}>
              <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
                <BarChart3 size={17} />
                Tickets por estado
              </h3>

              <div className="space-y-4">
                {(summary?.byStatus ?? []).map((item, index) => {
                  const key = item.status ?? 'UNKNOWN';
                  return (
                    <div key={`${key}-${index}`}>
                      <div className="mb-1 flex justify-between gap-2 text-xs">
                        <span className={headingClass}>{labelStatus(key)}</span>
                        <span className={mutedClass}>
                          {item.count} ({formatPercent(item.percent)})
                        </span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${subtleClass}`}>
                        <div
                          className={`h-full rounded-full ${statusColors[key] ?? 'bg-blue-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!summary?.byStatus?.length && (
                  <p className={`text-xs ${mutedClass}`}>Sin datos de estados.</p>
                )}
              </div>
            </section>

            <section className={panelClass}>
              <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
                <BarChart3 size={17} />
                Tickets por prioridad
              </h3>

              <div className="space-y-4">
                {(summary?.byPriority ?? []).map((item, index) => {
                  const key = item.priority ?? 'UNKNOWN';
                  return (
                    <div key={`${key}-${index}`}>
                      <div className="mb-1 flex justify-between gap-2 text-xs">
                        <span className={headingClass}>{labelPriority(key)}</span>
                        <span className={mutedClass}>
                          {item.count} ({formatPercent(item.percent)})
                        </span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${subtleClass}`}>
                        <div
                          className={`h-full rounded-full ${priorityColors[key] ?? 'bg-blue-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!summary?.byPriority?.length && (
                  <p className={`text-xs ${mutedClass}`}>Sin datos de prioridades.</p>
                )}
              </div>
            </section>
          </div>

          <section className={panelClass}>
            <h3 className={`mb-1 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
              <TrendingUp size={17} />
              Tendencia de tickets
            </h3>
            <p className={`mb-4 text-xs ${mutedClass}`}>
              Tickets creados y resueltos por día
            </p>

            <div className="mb-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                Creados
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Resueltos
              </span>
            </div>

            {trend.length ? (
              <div className="flex h-40 items-end gap-1 overflow-x-auto border-b border-l px-2 pt-3">
                {trend.map((item) => (
                  <div
                    key={item.date}
                    title={`${item.date}: ${item.created} creados, ${item.resolved} resueltos`}
                    className="flex h-full min-w-[9px] flex-1 items-end justify-center gap-[2px]"
                  >
                    <div
                      className="w-1/2 rounded-t bg-blue-500"
                      style={{ height: `${item.created ? Math.max(4, (item.created / maxTrend) * 100) : 0}%` }}
                    />
                    <div
                      className="w-1/2 rounded-t bg-emerald-500"
                      style={{ height: `${item.resolved ? Math.max(4, (item.resolved / maxTrend) * 100) : 0}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className={`py-8 text-center text-xs ${mutedClass}`}>
                No hay datos de tendencia para este período.
              </p>
            )}

            <div className={`mt-2 flex justify-between text-[10px] ${mutedClass}`}>
              <span>{appliedFrom}</span>
              <span>{appliedTo}</span>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={panelClass}>
              <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
                <Layers size={17} />
                Tickets por fuente
              </h3>

              <div className="space-y-3">
                {sources.map((item) => (
                  <div key={item.source} className="flex items-center justify-between gap-3 text-xs">
                    <span className={headingClass}>{labelSource(item.source)}</span>
                    <span className={`font-bold ${mutedClass}`}>{item.count}</span>
                  </div>
                ))}
                {!sources.length && (
                  <p className={`text-xs ${mutedClass}`}>Sin datos de fuentes.</p>
                )}
              </div>
            </section>

            <section className={panelClass}>
              <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
                <Users size={17} />
                Tickets por agente (Top 10)
              </h3>

              <div className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className={headingClass}>{agent.name}</span>
                    <span className={mutedClass}>
                      {agent.total} tickets · {agent.resolved} resueltos
                    </span>
                  </div>
                ))}
                {!agents.length && (
                  <p className={`text-xs ${mutedClass}`}>Sin datos de agentes.</p>
                )}
              </div>
            </section>
          </div>

          <section className={panelClass}>
            <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
              <CheckCircle2 size={17} />
              Cumplimiento SLA
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`${subtleClass} rounded-xl p-3`}>
                <p className={`text-xs ${mutedClass}`}>Primera respuesta</p>
                <p className={`mt-1 text-2xl font-extrabold ${headingClass}`}>
                  {sla.responseTotal
                    ? formatPercent((sla.responseMet / sla.responseTotal) * 100)
                    : 'Sin datos'}
                </p>
                <p className={`text-xs ${mutedClass}`}>
                  {sla.responseMet} de {sla.responseTotal} evaluados
                </p>
              </div>

              <div className={`${subtleClass} rounded-xl p-3`}>
                <p className={`text-xs ${mutedClass}`}>Resolución</p>
                <p className={`mt-1 text-2xl font-extrabold ${headingClass}`}>
                  {sla.resolutionTotal
                    ? formatPercent((sla.resolutionMet / sla.resolutionTotal) * 100)
                    : 'Sin datos'}
                </p>
                <p className={`text-xs ${mutedClass}`}>
                  {sla.resolutionMet} de {sla.resolutionTotal} evaluados
                </p>
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
              <Layers size={17} />
              Resumen de tableros Kanban
            </h3>

            {boards.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className={`border-b ${isLight ? 'border-gray-200' : 'border-white/10'} ${mutedClass}`}>
                      <th className="px-3 py-3 font-semibold">Tablero</th>
                      <th className="px-3 py-3 text-right font-semibold">Total</th>
                      <th className="px-3 py-3 text-right font-semibold">Completadas</th>
                      <th className="px-3 py-3 text-right font-semibold">Pendientes</th>
                      <th className="px-3 py-3 text-right font-semibold">Story Points</th>
                      <th className="px-3 py-3 font-semibold">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((board) => (
                      <tr
                        key={board.id}
                        className={`border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}
                      >
                        <td className={`px-3 py-3 font-semibold ${headingClass}`}>
                          {board.name}
                        </td>
                        <td className={`px-3 py-3 text-right ${headingClass}`}>{board.total}</td>
                        <td className="px-3 py-3 text-right text-emerald-500">{board.completed}</td>
                        <td className={`px-3 py-3 text-right ${headingClass}`}>{board.pending}</td>
                        <td className={`px-3 py-3 text-right ${mutedClass}`}>No disponible</td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-24 items-center gap-2">
                            <div className={`h-2 flex-1 overflow-hidden rounded-full ${subtleClass}`}>
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${board.progress}%` }}
                              />
                            </div>
                            <span className={`w-9 text-right ${mutedClass}`}>
                              {formatPercent(board.progress)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`text-xs ${mutedClass}`}>No hay tableros disponibles o no fue posible consultarlos.</p>
            )}
          </section>

          <section className={panelClass}>
            <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${headingClass}`}>
              <Clock3 size={17} />
              Tiempos de resolución por prioridad
            </h3>

            <div className="space-y-4">
              {resolution.map((item) => {
                const hours = item.avgResolutionHours ?? 0;
                const width = item.avgResolutionHours === null
                  ? 0
                  : Math.max(0, (hours / maxResolution) * 100);

                return (
                  <div key={item.priority}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className={headingClass}>{labelPriority(item.priority)}</span>
                      <span className={mutedClass}>
                        {formatHours(item.avgResolutionHours)} · {item.resolvedCount} resueltos
                      </span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${subtleClass}`}>
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {!resolution.length && (
                <p className={`text-xs ${mutedClass}`}>
                  No hay datos de resolución para el período seleccionado.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
