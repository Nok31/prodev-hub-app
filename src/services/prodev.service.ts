import { apiFetch } from './auth';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'WAITING_THIRD_PARTY'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TicketAssignee {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface UploadResult {
  uploadRef: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresIn: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const MAX_ATTACHMENTS = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function qs(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : '';
}

export const prodevService = {
  // --- PANEL ---
  getDashboardMetrics() {
    return apiFetch('/dashboard/metrics');
  },

  getDashboardActivity(limit = 15) {
    return apiFetch(`/dashboard/activity${qs({ limit })}`);
  },

  // --- TICKETS ---
  getTickets(
    params: {
      status?: TicketStatus;
      priority?: TicketPriority;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    return apiFetch(
      `/tickets${qs({
        ...params,
        pageSize: params.pageSize ?? 20,
      })}`,
    );
  },

  getTicketAssignees() {
    return apiFetch<{ data: TicketAssignee[] }>('/tickets/assignees');
  },

  getTicketById(id: string) {
    return apiFetch(`/tickets/${id}`);
  },

  getCategories() {
    return apiFetch('/tickets/categories');
  },

  uploadFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('El archivo supera el máximo de 10 MB.');
    }

    const formData = new FormData();
    formData.append('file', file);

    return apiFetch('/uploads', {
      method: 'POST',
      body: formData,
    }) as Promise<UploadResult>;
  },

  async uploadFiles(files: File[]): Promise<string[]> {
    if (files.length > MAX_ATTACHMENTS) {
      throw new Error('Máximo 10 adjuntos.');
    }

    const results = await Promise.all(
      files.map((file) => prodevService.uploadFile(file)),
    );

    return results.map((result) => result.uploadRef);
  },

  createTicket(payload: {
    title: string;
    description?: string;
    priority: TicketPriority;
    categoryId?: string;
    projectId?: string;
    assigneeId?: string;
    attachments?: string[];
  }) {
    return apiFetch('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createTicketWithFiles(
    payload: {
      title: string;
      description?: string;
      priority: TicketPriority;
      categoryId?: string;
      projectId?: string;
      assigneeId?: string;
    },
    files: File[] = [],
  ) {
    const attachments = files.length
      ? await prodevService.uploadFiles(files)
      : undefined;

    return prodevService.createTicket({
      ...payload,
      attachments,
    });
  },

  updateTicketStatus(id: string, status: TicketStatus) {
    return apiFetch(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  addTicketComment(
    id: string,
    payload: {
      content: string;
      isInternal?: boolean;
      attachments?: string[];
    },
  ) {
    return apiFetch(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- NOTIFICACIONES ---
  getNotifications(
    params: {
      unreadOnly?: boolean;
      limit?: number;
    } = {},
  ) {
    return apiFetch(
      `/notifications${qs({
        limit: 20,
        ...params,
      })}`,
    );
  },

  getUnreadCount() {
    return apiFetch('/notifications/unread-count');
  },

  markNotificationRead(id: string) {
    return apiFetch(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  markAllNotificationsRead() {
    return apiFetch('/notifications/read-all', {
      method: 'POST',
    });
  },

  // --- TABLEROS KANBAN ---
  getKanbanBoards() {
    return apiFetch('/kanban/boards');
  },

  getKanbanBoardById(id: string) {
    return apiFetch(`/kanban/boards/${id}`);
  },

  getCardDetail(cardId: string) {
    return apiFetch(`/kanban/cards/${cardId}`);
  },

  moveCard(
    cardId: string,
    payload: {
      listId: string;
      position?: number;
    },
  ) {
    return apiFetch(`/kanban/cards/${cardId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  addCardComment(
    cardId: string,
    payload: {
      content: string;
      attachments?: string[];
    },
  ) {
    return apiFetch(`/kanban/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- REPORTES ---
  getReportSummary() {
    return apiFetch('/reports/summary');
  },

  getResolutionTimes(
    params: {
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) {
    return apiFetch(`/reports/resolution-times${qs(params)}`);
  },

  // --- ASISTENTE IA ---
  getAiAgents() {
    return apiFetch('/ai/agents');
  },

  getAiConversations(
    params: {
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    return apiFetch(
      `/ai/conversations${qs({
        pageSize: 20,
        ...params,
      })}`,
    );
  },

  createAiConversation(payload: {
    agentId: string;
    projectId?: string;
  }) {
    return apiFetch('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAiConversation(id: string) {
    return apiFetch(`/ai/conversations/${id}`);
  },
};
