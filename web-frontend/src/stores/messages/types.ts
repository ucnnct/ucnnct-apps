import type { GroupSummary } from "../../api/groups";
import type {
  WsMessagePayload,
  WsOutboundActionType,
  WsPresenceUpdatePayload,
  WsTypingPayload,
} from "../../realtime/wsProtocol";
import type { AuthUser } from "../authStore";

export type ConversationKind = "peer" | "group";
export type MessageDeliveryStatus = "SENT" | "DELIVERED" | "READ";

export interface UserDirectoryEntry {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

export interface GroupDirectoryEntry {
  id: string;
  name: string;
  memberCount: number;
  ownerId: string | null;
}

export interface MessageConversationItem {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  avatarSeeds: string[];
  participantIds: string[];
  peerUserId: string | null;
  groupId: string | null;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderLabel: string;
  content: string;
  objectKey?: string;
  isOwn: boolean;
  status: MessageDeliveryStatus;
  createdAt: string;
}

export interface MessagesStoreState {
  activeUserId: string | null;
  loadingConversations: boolean;
  loadingMessagesByConversationId: Record<string, boolean>;
  loadedMessagesByConversationId: Record<string, boolean>;
  conversations: MessageConversationItem[];
  messagesByConversationId: Record<string, MessageItem[]>;
  presenceByUserId: Record<string, boolean>;
  typingByConversationId: Record<string, Record<string, number>>;
  selectedConversationId: string | null;
  userDirectory: Record<string, UserDirectoryEntry>;
  groupDirectory: Record<string, GroupDirectoryEntry>;
  error: string | null;
  bootstrap: (authUser: AuthUser) => Promise<void>;
  reset: () => void;
  ensurePeerConversation: (authUser: AuthUser, peerUserId: string) => Promise<string | null>;
  upsertGroupConversation: (
    group: GroupSummary,
    authUserId: string,
    participantIds?: string[],
    options?: {
      select?: boolean;
    },
  ) => string | null;
  removeGroupConversation: (groupId: string) => void;
  removeGroupConversationParticipant: (groupId: string, userId: string) => void;
  selectConversation: (conversationId: string, authUserId: string) => Promise<void>;
  loadMessages: (conversationId: string, authUserId: string, force?: boolean) => Promise<void>;
  ingestWsMessage: (payload: WsMessagePayload, authUser: AuthUser) => void;
  ingestWsMessageAck: (
    payload: WsMessagePayload,
    actionType: WsOutboundActionType,
    authUserId: string,
  ) => void;
  ingestPresenceUpdate: (payload: WsPresenceUpdatePayload) => void;
  ingestTypingUpdate: (payload: WsTypingPayload, authUserId: string) => void;
  pruneExpiredTyping: () => void;
}

export interface WsConversationRef {
  conversationId: string;
  kind: ConversationKind;
  peerUserId: string | null;
  groupId: string | null;
}
