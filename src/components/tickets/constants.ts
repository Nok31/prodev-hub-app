import type { TicketStatus, TicketPriority } from '@/services/prodev.service';

// Las clases van completas (Tailwind no detecta strings armados dinámicamente).
export const STATUS_ORDER: TicketStatus[] = [
  'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'CANCELLED',
];

export const STATUS_META: Record<TicketStatus, { label: string; badge: string }> = {
  OPEN: { label: 'Abierto', badge: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  IN_PROGRESS: { label: 'En proceso', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  WAITING_CUSTOMER: { label: 'Esperando cliente', badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  WAITING_THIRD_PARTY: { label: 'Esperando tercero', badge: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  RESOLVED: { label: 'Resuelto', badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  CLOSED: { label: 'Cerrado', badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  CANCELLED: { label: 'Cancelado', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

export const PRIORITY_ORDER: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const PRIORITY_META: Record<TicketPriority, { label: string; badge: string }> = {
  CRITICAL: { label: 'Crítica', badge: 'bg-red-500/15 text-red-500 border-red-500/30' },
  HIGH: { label: 'Alta', badge: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  MEDIUM: { label: 'Media', badge: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  LOW: { label: 'Baja', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

export const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function inputClass(isLight: boolean) {
  return isLight
    ? 'w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-500 transition'
    : 'w-full px-3 py-2.5 bg-[#0b0f19] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition';
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();
}

/** Mensaje para mostrar al usuario, incluyendo posibles detalles de validación de la API. */
export function errMsg(e: unknown, fallback: string) {
  if (e instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }

  if (e instanceof Error && e.message) {
    const apiError = e as Error & {
      issues?: Array<{ message?: string }>;
    };
    const extra = apiError.issues?.map((i) => i.message).filter(Boolean).join(' · ');
    return extra ? `${e.message}: ${extra}` : e.message;
  }

  return fallback;
}
