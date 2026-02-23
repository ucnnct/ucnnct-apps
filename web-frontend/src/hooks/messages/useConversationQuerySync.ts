import { useEffect } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import type { AuthUser } from "../../auth/AuthProvider";
import type { MessageConversationItem } from "../../stores/messagesStore";

interface UseConversationQuerySyncArgs {
  user: AuthUser | null;
  conversations: MessageConversationItem[];
  loadingConversations: boolean;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  selectedConversationId: string | null;
  ensurePeerConversation: (authUser: AuthUser, peerUserId: string) => Promise<string | null>;
  selectConversation: (conversationId: string, authUserId: string) => Promise<void>;
  onConversationResolved: () => void;
}

export function useConversationQuerySync({
  user,
  conversations,
  loadingConversations,
  searchParams,
  setSearchParams,
  selectedConversationId,
  ensurePeerConversation,
  selectConversation,
  onConversationResolved,
}: UseConversationQuerySyncArgs): void {
  useEffect(() => {
    if (!user?.sub || loadingConversations) {
      return;
    }

    const requestedKind = searchParams.get("kind");
    const requestedTarget = searchParams.get("target");
    if (!requestedKind || !requestedTarget) {
      return;
    }

    let cancelled = false;

    const syncRequestedConversation = async () => {
      let requestedConversationId: string | null = null;
      if (requestedKind === "group") {
        const groupConversationId = `group:${requestedTarget}`;
        requestedConversationId = conversations.some(
          (conversation) => conversation.id === groupConversationId,
        )
          ? groupConversationId
          : null;
      } else if (requestedKind === "peer") {
        requestedConversationId = await ensurePeerConversation(user, requestedTarget);
      }

      if (!requestedConversationId || cancelled) {
        return;
      }

      if (selectedConversationId !== requestedConversationId) {
        await selectConversation(requestedConversationId, user.sub);
      }

      if (cancelled) {
        return;
      }
      onConversationResolved();

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("kind");
      nextParams.delete("target");
      setSearchParams(nextParams, { replace: true });
    };

    void syncRequestedConversation();

    return () => {
      cancelled = true;
    };
  }, [
    conversations,
    ensurePeerConversation,
    loadingConversations,
    onConversationResolved,
    searchParams,
    selectedConversationId,
    selectConversation,
    setSearchParams,
    user,
  ]);
}
