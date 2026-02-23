import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Layout from "../components/layout/Layout";
import {
  ConversationHeader,
  ConversationListPanel,
  CreateGroupModal,
  GroupMembersModal,
  MessageComposer,
  MessagesTimeline,
} from "../components/messages";
import {
  TYPING_REFRESH_INTERVAL_MS,
  useConversationQuerySync,
  useGroupConversationModals,
  useMessageAttachment,
  useMessageReadAcks,
  useMessageTypingComposer,
} from "../hooks/messages";
import { useAppSocket } from "../realtime/AppSocketProvider";
import { useMessagesStore } from "../stores/messagesStore";
import { useNetworkStore } from "../stores/networkStore";

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { connected: isWsConnected, sendAction } = useAppSocket();
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  const conversations = useMessagesStore((state) => state.conversations);
  const selectedConversationId = useMessagesStore((state) => state.selectedConversationId);
  const messagesByConversationId = useMessagesStore((state) => state.messagesByConversationId);
  const presenceByUserId = useMessagesStore((state) => state.presenceByUserId);
  const typingByConversationId = useMessagesStore((state) => state.typingByConversationId);
  const loadingConversations = useMessagesStore((state) => state.loadingConversations);
  const loadingMessagesByConversationId = useMessagesStore(
    (state) => state.loadingMessagesByConversationId,
  );
  const userDirectory = useMessagesStore((state) => state.userDirectory);
  const groupDirectory = useMessagesStore((state) => state.groupDirectory);
  const error = useMessagesStore((state) => state.error);
  const bootstrap = useMessagesStore((state) => state.bootstrap);
  const ensurePeerConversation = useMessagesStore((state) => state.ensurePeerConversation);
  const upsertGroupConversation = useMessagesStore((state) => state.upsertGroupConversation);
  const removeGroupConversationParticipant = useMessagesStore(
    (state) => state.removeGroupConversationParticipant,
  );
  const selectConversation = useMessagesStore((state) => state.selectConversation);
  const pruneExpiredTyping = useMessagesStore((state) => state.pruneExpiredTyping);
  const reset = useMessagesStore((state) => state.reset);

  const friends = useNetworkStore((state) => state.friends);
  const loadNetwork = useNetworkStore((state) => state.load);

  useEffect(() => {
    if (!user) {
      reset();
      return;
    }
    void bootstrap(user);
  }, [bootstrap, reset, user]);

  useEffect(() => {
    if (!user?.sub) {
      return;
    }
    void loadNetwork(user.sub);
  }, [loadNetwork, user?.sub]);

  useConversationQuerySync({
    user,
    conversations,
    loadingConversations,
    searchParams,
    setSearchParams,
    selectedConversationId,
    ensurePeerConversation,
    selectConversation,
    onConversationResolved: () => setMobileConversationOpen(true),
  });

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) {
      return null;
    }
    return (
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      conversations[0]
    );
  }, [conversations, selectedConversationId]);

  const selectedMessages = selectedConversation
    ? messagesByConversationId[selectedConversation.id] ?? []
    : [];
  const isLoadingMessages = selectedConversation
    ? Boolean(loadingMessagesByConversationId[selectedConversation.id])
    : false;

  const selectedPeerOnline =
    selectedConversation?.kind === "peer" && selectedConversation.peerUserId
      ? Boolean(presenceByUserId[selectedConversation.peerUserId])
      : false;

  const selectedGroupOnlineCount =
    selectedConversation?.kind === "group"
      ? selectedConversation.participantIds.filter(
          (participantId) => participantId !== user?.sub && Boolean(presenceByUserId[participantId]),
        ).length
      : 0;

  const selectedConversationTypingLabel = useMemo(() => {
    if (!selectedConversation || !user?.sub) {
      return null;
    }

    const now = Date.now();
    const typingUsers = Object.entries(typingByConversationId[selectedConversation.id] ?? {})
      .filter(([, expiresAt]) => expiresAt > now)
      .map(([typingUserId]) => typingUserId)
      .filter((typingUserId) => typingUserId !== user.sub);

    if (typingUsers.length === 0) {
      return null;
    }

    if (selectedConversation.kind === "peer") {
      return "Ecrit...";
    }

    if (typingUsers.length === 1) {
      const typingUserId = typingUsers[0];
      const displayName = userDirectory[typingUserId]?.displayName ?? "Quelqu'un";
      return `${displayName} ecrit...`;
    }

    return `${typingUsers.length} personnes ecrivent...`;
  }, [selectedConversation, typingByConversationId, user?.sub, userDirectory]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      pruneExpiredTyping();
    }, TYPING_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [pruneExpiredTyping]);

  useMessageReadAcks({
    userId: user?.sub ?? null,
    isWsConnected,
    selectedConversation,
    selectedMessages,
    sendAction,
  });

  const { draft, handleDraftChange, handleSendMessage } = useMessageTypingComposer({
    userId: user?.sub ?? null,
    isWsConnected,
    selectedConversation,
    sendAction,
  });

  const {
    uploadingAttachment,
    attachmentStatusLabel,
    attachmentError,
    sendAttachmentMessage,
  } = useMessageAttachment({
    selectedConversation,
    isWsConnected,
    sendAction,
  });

  const {
    createGroupOpen,
    creatingGroup,
    createGroupError,
    membersModalOpen,
    membersModalLoading,
    membersModalError,
    membersModalGroupName,
    membersModalMembers,
    removingMemberIds,
    canRemoveGroupMembers,
    openCreateGroup,
    closeCreateGroup,
    handleCreateGroup,
    openGroupMembers,
    closeGroupMembers,
    handleRemoveGroupMember,
  } = useGroupConversationModals({
    userId: user?.sub ?? null,
    selectedConversation,
    presenceByUserId,
    groupDirectory,
    upsertGroupConversation,
    selectConversation,
    removeGroupConversationParticipant,
    openConversationOnMobile: () => setMobileConversationOpen(true),
  });

  const handleConversationSelect = (conversationId: string) => {
    if (!user?.sub) {
      return;
    }
    setMobileConversationOpen(true);
    void selectConversation(conversationId, user.sub);
  };

  return (
    <Layout hideSidebarRight>
      <div className="flex h-full bg-white overflow-hidden font-body">
        <ConversationListPanel
          className={mobileConversationOpen ? "hidden lg:flex" : "flex"}
          conversations={conversations}
          presenceByUserId={presenceByUserId}
          activeUserId={user?.sub ?? null}
          selectedConversationId={selectedConversation?.id ?? null}
          loadingConversations={loadingConversations}
          onSelectConversation={handleConversationSelect}
          onRequestCreateGroup={openCreateGroup}
        />

        <div
          className={`flex-1 flex-col h-full bg-white ${
            mobileConversationOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-secondary-400">
              Selectionne une conversation pour commencer.
            </div>
          ) : (
            <>
              <ConversationHeader
                conversation={selectedConversation}
                isPeerOnline={selectedPeerOnline}
                groupOnlineCount={selectedGroupOnlineCount}
                typingLabel={selectedConversationTypingLabel}
                showBackButton={mobileConversationOpen}
                onBack={() => setMobileConversationOpen(false)}
                onRequestOpenGroupMembers={() => void openGroupMembers()}
              />
              <MessagesTimeline
                messages={selectedMessages}
                isLoadingMessages={isLoadingMessages}
                error={error}
              />
              <MessageComposer
                draft={draft}
                isWsConnected={isWsConnected}
                uploadingAttachment={uploadingAttachment}
                attachmentStatusLabel={attachmentStatusLabel}
                attachmentError={attachmentError}
                onDraftChange={handleDraftChange}
                onSendMessage={handleSendMessage}
                onAttachmentSelected={sendAttachmentMessage}
              />
            </>
          )}
        </div>
      </div>

      <CreateGroupModal
        open={createGroupOpen}
        friends={friends}
        submitting={creatingGroup}
        error={createGroupError}
        onClose={closeCreateGroup}
        onSubmit={handleCreateGroup}
      />

      <GroupMembersModal
        open={membersModalOpen}
        groupName={membersModalGroupName}
        members={membersModalMembers}
        loading={membersModalLoading}
        error={membersModalError}
        canRemoveMembers={canRemoveGroupMembers}
        currentUserId={user?.sub ?? null}
        removingUserIds={removingMemberIds}
        onRemoveMember={handleRemoveGroupMember}
        onClose={closeGroupMembers}
      />
    </Layout>
  );
}
