export const WS_INBOUND_ACTIONS = [
  "SEND_PRIVATE_MESSAGE",
  "SEND_GROUP_MESSAGE",
  "SEND_FILE_MESSAGE",
  "MESSAGE_RECEIVED",
  "MESSAGE_READ",
  "UPDATE_ACTIVE_CONTEXT",
] as const;

export type WsInboundActionType = (typeof WS_INBOUND_ACTIONS)[number];

export const WS_OUTBOUND_ACTIONS = [
  "PRIVATE_MESSAGE",
  "GROUP_MESSAGE",
  "FILE_MESSAGE",
  "NOTIFICATION",
  "MESSAGE_SENT_ACK",
  "GROUP_MESSAGE_SENT_ACK",
  "FILE_MESSAGE_SENT_ACK",
  "MESSAGE_RECEIVED_CONFIRMED",
  "GROUP_MESSAGE_RECEIVED_CONFIRMED",
  "MESSAGE_READ_CONFIRMED",
  "GROUP_MESSAGE_READ_CONFIRMED",
  "UPLOAD_COMPLETED_ACK",
  "DOWNLOAD_REQUEST_ACK",
  "ERROR",
] as const;

export type WsOutboundActionType = (typeof WS_OUTBOUND_ACTIONS)[number];
export type WsActionType = WsInboundActionType | WsOutboundActionType;
export type WsMessageType = "PRIVATE" | "GROUP";

export interface WsPacket<TPayload = unknown> {
  type: string;
  payload?: TPayload | null;
  timestamp?: number;
}

export interface WsMessagePayload {
  messageId?: string;
  type?: WsMessageType;
  senderId?: string;
  groupId?: string;
  receiversId?: string[];
  content?: string;
  objectKey?: string;
  status?: string;
}

export interface WsNotificationPayload {
  notificationId?: string;
  ownerUserId?: string;
  targetId?: string;
  category?: string;
  content?: string;
  status?: string;
  createdAt?: number;
  readAt?: number;
}

export interface WsUserActiveContextPayload {
  page: string;
  conversationId?: string;
  updatedAt?: number;
}

export interface WsErrorPayload {
  message?: string;
}
