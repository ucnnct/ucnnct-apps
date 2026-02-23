import { useCallback, useEffect, useRef, useState } from "react";
import { TYPING_IDLE_DELAY_MS, TYPING_START_THROTTLE_MS } from "./constants";
import type { WsInboundActionType } from "../../realtime/wsProtocol";
import type { MessageConversationItem } from "../../stores/messagesStore";

type SendAction = <TPayload = unknown>(
  actionType: WsInboundActionType,
  payload: TPayload,
) => boolean;

interface UseMessageTypingComposerArgs {
  userId: string | null;
  isWsConnected: boolean;
  selectedConversation: MessageConversationItem | null;
  sendAction: SendAction;
}

interface UseMessageTypingComposerResult {
  draft: string;
  handleDraftChange: (value: string) => void;
  handleSendMessage: () => void;
  stopTypingForConversation: (conversation: MessageConversationItem | null) => void;
}

export function useMessageTypingComposer({
  userId,
  isWsConnected,
  selectedConversation,
  sendAction,
}: UseMessageTypingComposerArgs): UseMessageTypingComposerResult {
  const [draft, setDraft] = useState("");
  const typingStopTimerRef = useRef<number | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);
  const lastTypingStartSentAtRef = useRef<number>(0);
  const previousConversationRef = useRef<MessageConversationItem | null>(null);

  const clearTypingStopTimer = useCallback(() => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
  }, []);

  const emitTypingState = useCallback(
    (conversation: MessageConversationItem | null, isTyping: boolean): boolean => {
      if (!userId || !isWsConnected || !conversation || conversation.kind !== "peer") {
        return false;
      }
      const targetUserId = conversation.peerUserId;
      if (!targetUserId) {
        return false;
      }

      return sendAction("SEND_TYPING", {
        conversationId: conversation.id,
        targetUserId,
        isTyping,
        ttlMs: 3000,
      });
    },
    [isWsConnected, sendAction, userId],
  );

  const stopTypingForConversation = useCallback(
    (conversation: MessageConversationItem | null) => {
      if (!conversation) {
        return;
      }
      clearTypingStopTimer();
      emitTypingState(conversation, false);
      if (typingConversationIdRef.current === conversation.id) {
        typingConversationIdRef.current = null;
      }
    },
    [clearTypingStopTimer, emitTypingState],
  );

  useEffect(() => {
    const previousConversation = previousConversationRef.current;
    const nextConversationId = selectedConversation?.id ?? null;
    if (
      previousConversation &&
      previousConversation.id !== nextConversationId &&
      typingConversationIdRef.current === previousConversation.id
    ) {
      stopTypingForConversation(previousConversation);
    }
    previousConversationRef.current = selectedConversation;
  }, [selectedConversation, stopTypingForConversation]);

  useEffect(() => {
    return () => {
      clearTypingStopTimer();
    };
  }, [clearTypingStopTimer]);

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);

      if (!selectedConversation || selectedConversation.kind !== "peer") {
        return;
      }

      const hasContent = value.trim().length > 0;
      if (!hasContent) {
        stopTypingForConversation(selectedConversation);
        return;
      }

      const now = Date.now();
      const shouldSendTypingStart =
        typingConversationIdRef.current !== selectedConversation.id ||
        now - lastTypingStartSentAtRef.current >= TYPING_START_THROTTLE_MS;

      if (shouldSendTypingStart) {
        const startSent = emitTypingState(selectedConversation, true);
        if (startSent) {
          typingConversationIdRef.current = selectedConversation.id;
          lastTypingStartSentAtRef.current = now;
        }
      }

      clearTypingStopTimer();
      typingStopTimerRef.current = window.setTimeout(() => {
        if (typingConversationIdRef.current !== selectedConversation.id) {
          return;
        }
        const stopSent = emitTypingState(selectedConversation, false);
        if (stopSent) {
          typingConversationIdRef.current = null;
        }
      }, TYPING_IDLE_DELAY_MS);
    },
    [clearTypingStopTimer, emitTypingState, selectedConversation, stopTypingForConversation],
  );

  const handleSendMessage = useCallback(() => {
    if (!selectedConversation) {
      return;
    }

    const content = draft.trim();
    if (!content) {
      return;
    }

    let sent = false;
    if (selectedConversation.kind === "group" && selectedConversation.groupId) {
      sent = sendAction("SEND_GROUP_MESSAGE", {
        groupId: selectedConversation.groupId,
        content,
      });
    } else if (selectedConversation.kind === "peer" && selectedConversation.peerUserId) {
      sent = sendAction("SEND_PRIVATE_MESSAGE", {
        receiversId: [selectedConversation.peerUserId],
        content,
      });
    }

    if (sent) {
      setDraft("");
      stopTypingForConversation(selectedConversation);
    }
  }, [draft, selectedConversation, sendAction, stopTypingForConversation]);

  return {
    draft,
    handleDraftChange,
    handleSendMessage,
    stopTypingForConversation,
  };
}
