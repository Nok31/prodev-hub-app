export interface AiAgent {
  id: string;
  name: string;
  type: string;
  welcomeMessage?: string;
  provider?: string;
}

export interface AiConversation {
  id: string;
  agentId?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string | {
    content?: string;
    role?: string;
    createdAt?: string;
  };
}

export interface AiConversationDetail {
  id: string;
  agentId?: string;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
  }[];
}
