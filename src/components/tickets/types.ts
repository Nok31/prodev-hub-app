import type { TicketStatus, TicketPriority } from '@/services/prodev.service';

export interface Usuario {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Adjunto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string; // URL firmada: vence a los 10 min
  uploadedBy?: Usuario | null;
  createdAt: string;
}

export interface Comentario {
  id: string;
  content: string; // un comentario borrado llega con content vacío
  isInternal: boolean;
  isDeleted: boolean;
  author: Usuario | null;
  attachments: Adjunto[];
  createdAt: string;
  editedAt: string | null;
}

export interface TicketResumen {
  id: string;
  number: string; // PRD-YYYY-####
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: string;
  category: { id?: string; name: string; color?: string; icon?: string } | null;
  reporter: Usuario | null;
  assignee: Usuario | null;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetalle extends Omit<TicketResumen, 'commentCount' | 'attachmentCount'> {
  description: string | null;
  tags?: unknown[];
  team?: { name?: string } | null;
  project?: { id?: string; name?: string } | null;
  sla?: {
    responseDue: string | null;
    resolutionDue: string | null;
    responseMet: boolean | null;
    resolutionMet: boolean | null;
  } | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  comments: Comentario[];
  attachments: Adjunto[];
  history?: unknown[];
}
