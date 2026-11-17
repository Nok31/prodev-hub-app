import { apiFetch } from './auth';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const prodevService = {
  // --- TICKETS ---
  async getTickets(params: { status?: string; priority?: string; search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    query.set('pageSize', String(params.pageSize || 20));
    return apiFetch(`/tickets?${query.toString()}`);
  },

  async getTicketById(id: string) {
    return apiFetch(`/tickets/${id}`);
  },

  async getCategories() {
    return apiFetch('/tickets/categories');
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/uploads', {
      method: 'POST',
      body: formData,
      headers: {}, 
    });
  },

  async createTicket(payload: { title: string; description?: string; priority: TicketPriority; categoryId?: string; projectId?: string; attachments?: string[] }) {
    return apiFetch('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTicketStatus(id: string, status: TicketStatus) {
    return apiFetch(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async addTicketComment(id: string, payload: { content: string; isInternal?: boolean; attachments?: string[] }) {
    return apiFetch(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- TABLEROS KANBAN ---
  async getKanbanBoards() {
    return apiFetch('/kanban/boards');
  },

  async getKanbanBoardById(id: string) {
    return apiFetch(`/kanban/boards/${id}`);
  },

  async getCardDetail(cardId: string) {
    return apiFetch(`/kanban/cards/${cardId}`);
  },

  async moveCard(cardId: string, payload: { listId: string; position?: number }) {
    return apiFetch(`/kanban/cards/${cardId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async addCardComment(cardId: string, payload: { content: string; attachments?: string[] }) {
    return apiFetch(`/kanban/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};
