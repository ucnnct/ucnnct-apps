export const DEFAULT_TYPING_TTL_MS = 3000;
export const MAX_TYPING_TTL_MS = 10_000;

export const runtimeState = {
  conversationsLoadPromise: null as Promise<void> | null,
  messagesLoadPromises: new Map<string, Promise<void>>(),
  userHydrationInFlight: new Set<string>(),
  groupHydrationInFlight: new Set<string>(),
};

export function resetMessagesRuntime(): void {
  runtimeState.conversationsLoadPromise = null;
  runtimeState.messagesLoadPromises.clear();
  runtimeState.userHydrationInFlight.clear();
  runtimeState.groupHydrationInFlight.clear();
}

export function cleanupTypingState(
  typingByConversationId: Record<string, Record<string, number>>,
  now: number,
): {
  nextTypingByConversationId: Record<string, Record<string, number>>;
  changed: boolean;
} {
  let changed = false;
  const nextTypingByConversationId: Record<string, Record<string, number>> = {};

  for (const [conversationId, userExpirations] of Object.entries(typingByConversationId)) {
    const nextUserExpirations: Record<string, number> = {};
    for (const [userId, expiresAt] of Object.entries(userExpirations)) {
      if (typeof expiresAt === "number" && expiresAt > now) {
        nextUserExpirations[userId] = expiresAt;
      } else {
        changed = true;
      }
    }

    if (Object.keys(nextUserExpirations).length > 0) {
      nextTypingByConversationId[conversationId] = nextUserExpirations;
      continue;
    }

    if (Object.keys(userExpirations).length > 0) {
      changed = true;
    }
  }

  if (!changed) {
    const previousKeys = Object.keys(typingByConversationId).length;
    const nextKeys = Object.keys(nextTypingByConversationId).length;
    changed = previousKeys !== nextKeys;
  }

  return {
    nextTypingByConversationId,
    changed,
  };
}
