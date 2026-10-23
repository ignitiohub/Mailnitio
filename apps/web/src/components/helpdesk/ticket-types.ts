export interface TicketMessage {
  id: string;
  direction: "inbound" | "outbound" | "note";
  authorType: "customer" | "agent" | "system";
  authorId: string | null;
  fromAddr: string | null;
  fromName: string | null;
  toAddrs: string[];
  subject: string | null;
  bodyText: string;
  sentStatus: string;
  emailLogId: string | null;
  createdAt: string;
}

export interface TicketEvent {
  id: string;
  type: string;
  actorType: string;
  actorName: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  key: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  tags: string[];
  escalated: boolean;
  needsReview: boolean;
  aiSummary: string | null;
  firstResponseDue: string | null;
  firstRespondedAt: string | null;
  resolutionDue: string | null;
  resolvedAt: string | null;
  reopenedCount: number;
  mailbox: string | null;
  mailboxMode: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  events: TicketEvent[];
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
    createdAt: string;
    ticketCount: number;
    openCount: number;
  } | null;
  related: { id: string; key: string; subject: string; status: string }[];
  ai: {
    emailLogId: string | null;
    category: string | null;
    confidence: number | null;
    aiReason: string | null;
    replyType: string | null;
    rerouted: boolean;
    originalTeam: string | null;
    matchMethod: string | null;
    customerMatchMethod: string | null;
    model: string | null;
    costUsd: number;
  } | null;
  review: { id: string; reasons: string[] } | null;
  mergedInto: { id: string; key: string } | null;
}
