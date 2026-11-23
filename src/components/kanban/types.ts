import type { TicketPriority } from '@/services/prodev.service';

export interface KanbanPerson {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface KanbanLabel {
  id: string;
  name: string;
  color?: string | null;
}

export interface KanbanCard {
  id: string;
  number: string | null;
  title: string;
  position: number;
  dueDate: string | null;
  isComplete: boolean;
  priority: TicketPriority | null;
  members: KanbanPerson[];
  labels: KanbanLabel[];
  commentCount: number;
  attachmentCount: number;
  checklistCount: number;
}

export interface KanbanList {
  id: string;
  name: string;
  position: number;
  cardCount: number;
  cards: KanbanCard[];
}

export interface KanbanBoardSummary {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  visibility: string;
  owner: KanbanPerson | null;
  listCount: number;
  memberCount: number;
  updatedAt: string;
}

export interface KanbanBoard extends KanbanBoardSummary {
  access: {
    canEdit: boolean;
  };
  lists: KanbanList[];
}

export interface KanbanComment {
  id: string;
  content: string;
  author: KanbanPerson;
  createdAt: string;
}

export interface KanbanCardDetail extends KanbanCard {
  description: string | null;
  list: KanbanList;
  boardId: string;
  creator: KanbanPerson;
  checklists: unknown[];
  comments: KanbanComment[];
  attachments: unknown[];
  activity: unknown[];
  createdAt: string;
  updatedAt: string;
  linkedTicket: unknown | null;
}
