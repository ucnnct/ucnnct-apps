import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { groupApi, type GroupMemberSummary } from "../api/groups";
import { mediaApi } from "../api/media";
import { userApi, type UserProfile } from "../api/users";
import { useAuth } from "../auth/AuthProvider";
import Layout from "../components/layout/Layout";
import {
  ConversationHeader,
  ConversationListPanel,
  CreateGroupModal,
  GroupMembersModal,
  type GroupMemberViewItem,
  MessageComposer,
  MessagesTimeline,
} from "../components/messages";
import { toErrorMessage } from "../components/messages/utils";
import { useAppSocket } from "../realtime/AppSocketProvider";
import { useMessagesStore, type MessageConversationItem } from "../stores/messagesStore";
import { useNetworkStore } from "../stores/networkStore";

function resolveProfileDisplayName(profile: UserProfile, fallbackUserId: string): string {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return fullName || profile.email || profile.username || fallbackUserId;
}

function resolveProfileHandle(profile: UserProfile): string {
  const username = profile.username ?? "";
  return username.includes("@") ? `@${profile.email.split("@")[0]}` : `@${username}`;
}

const TYPING_REFRESH_INTERVAL_MS = 1000;
const TYPING_IDLE_DELAY_MS = 1500;
const TYPING_START_THROTTLE_MS = 1000;

function toMemberViewItems(
  members: GroupMemberSummary[],
  profilesById: Record<string, UserProfile>,
  presenceByUserId: Record<string, boolean>,
): GroupMemberViewItem[] {
  const items = members.map((member) => {
    const profile = profilesById[member.userId];
    return {
      userId: member.userId,
      role: member.role,
      displayName: profile
        ? resolveProfileDisplayName(profile, member.userId)
        : `Utilisateur ${member.userId.slice(0, 8)}`,
      handle: profile ? resolveProfileHandle(profile) : `@${member.userId.slice(0, 8)}`,
      avatarUrl: profile?.avatarUrl ?? null,
      online: Boolean(presenceByUserId[member.userId]),
    };
  });

  const rank: Record<GroupMemberSummary["role"], number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
  };

  return items.sort((left, right) => {
    const roleOrder = rank[left.role] - rank[right.role];
    if (roleOrder !== 0) {
      return roleOrder;
    }
    return left.displayName.localeCompare(right.displayName, "fr");
  });
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { connected: isWsConnected, sendAction } = useAppSocket();

  const [draft, setDraft] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentStatusLabel, setAttachmentStatusLabel] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersModalLoading, setMembersModalLoading] = useState(false);
  const [membersModalError, setMembersModalError] = useState<string | null>(null);
  const [membersModalGroupId, setMembersModalGroupId] = useState<string | null>(null);
  const [membersModalGroupName, setMembersModalGroupName] = useState("");
  const [membersModalOwnerId, setMembersModalOwnerId] = useState<string | null>(null);
  const [membersModalMembers, setMembersModalMembers] = useState<GroupMemberViewItem[]>([]);
  const [removingMemberIds, setRemovingMemberIds] = useState<Set<string>>(new Set());

  const readAckSentMessageIdsRef = useRef<Set<string>>(new Set());
  const typingStopTimerRef = useRef<number | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);
  const lastTypingStartSentAtRef = useRef<number>(0);
  const previousConversationIdRef = useRef<string | null>(null);

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
      readAckSentMessageIdsRef.current.clear();
      return;
    }
    void loadNetwork(user.sub);
  }, [loadNetwork, user?.sub]);

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
      setMobileConversationOpen(true);

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
    searchParams,
    selectedConversationId,
    selectConversation,
    setSearchParams,
    user,
  ]);

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) {
      return null;
    }
    return (
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      conversations[0]
    );
  }, [conversations, selectedConversationId]);

  const clearTypingStopTimer = useCallback(() => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
  }, []);

  const emitTypingState = useCallback(
    (conversation: MessageConversationItem | null, isTyping: boolean): boolean => {
      if (!user?.sub || !isWsConnected || !conversation || conversation.kind !== "peer") {
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
    [isWsConnected, sendAction, user?.sub],
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

  const canRemoveGroupMembers = Boolean(
    user?.sub &&
      (membersModalOwnerId
        ? membersModalOwnerId === user.sub
        : selectedConversation?.kind === "group" &&
          selectedConversation.groupId &&
          groupDirectory[selectedConversation.groupId]?.ownerId === user.sub),
  );

  useEffect(() => {
    if (!membersModalOpen) {
      return;
    }
    setMembersModalMembers((previous) =>
      previous.map((member) => ({
        ...member,
        online: Boolean(presenceByUserId[member.userId]),
      })),
    );
  }, [membersModalOpen, presenceByUserId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      pruneExpiredTyping();
    }, TYPING_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [pruneExpiredTyping]);

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current;
    const nextConversationId = selectedConversation?.id ?? null;
    if (
      previousConversationId &&
      previousConversationId !== nextConversationId &&
      typingConversationIdRef.current === previousConversationId
    ) {
      const previousConversation =
        conversations.find((conversation) => conversation.id === previousConversationId) ?? null;
      stopTypingForConversation(previousConversation);
    }
    previousConversationIdRef.current = nextConversationId;
  }, [conversations, selectedConversation?.id, stopTypingForConversation]);

  useEffect(() => {
    return () => {
      clearTypingStopTimer();
    };
  }, [clearTypingStopTimer]);

  useEffect(() => {
    if (!user?.sub || !isWsConnected || !selectedConversation) {
      return;
    }

    const type = selectedConversation.kind === "group" ? "GROUP" : "PRIVATE";
    const groupId =
      selectedConversation.kind === "group" && selectedConversation.groupId
        ? selectedConversation.groupId
        : undefined;

    for (const message of selectedMessages) {
      if (
        message.isOwn ||
        message.status === "READ" ||
        readAckSentMessageIdsRef.current.has(message.id)
      ) {
        continue;
      }

      const readAckSent = sendAction("MESSAGE_READ", {
        messageId: message.id,
        senderId: message.senderId,
        type,
        groupId,
      });

      if (readAckSent) {
        readAckSentMessageIdsRef.current.add(message.id);
      }
    }
  }, [isWsConnected, selectedConversation, selectedMessages, sendAction, user?.sub]);

  const handleConversationSelect = (conversationId: string) => {
    if (!user?.sub) {
      return;
    }
    setMobileConversationOpen(true);
    void selectConversation(conversationId, user.sub);
  };

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

  const handleSendMessage = () => {
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
  };

  const sendAttachmentMessage = useCallback(
    async (file: File) => {
      if (!selectedConversation) {
        return;
      }
      if (!isWsConnected) {
        setAttachmentError("WebSocket deconnecte. Reconnecte-toi puis reessaye.");
        return;
      }

      setUploadingAttachment(true);
      setAttachmentStatusLabel("Preparation du fichier...");
      setAttachmentError(null);

      let objectKey: string | null = null;

      try {
        setAttachmentStatusLabel("Upload du fichier en cours...");
        const uploadResponse = await mediaApi.upload(file, "chat");
        objectKey = uploadResponse.key;

        const payload = {
          objectKey: uploadResponse.key,
          content: file.name,
        };

        let sent = false;
        setAttachmentStatusLabel("Envoi du message en cours...");
        if (selectedConversation.kind === "group" && selectedConversation.groupId) {
          sent = sendAction("SEND_FILE_MESSAGE", {
            ...payload,
            groupId: selectedConversation.groupId,
          });
        } else if (selectedConversation.kind === "peer" && selectedConversation.peerUserId) {
          sent = sendAction("SEND_FILE_MESSAGE", {
            ...payload,
            receiversId: [selectedConversation.peerUserId],
          });
        }

        if (!sent) {
          throw new Error("Envoi WS impossible. Le fichier n'a pas ete envoye.");
        }
      } catch (uploadError) {
        if (objectKey) {
          void mediaApi.delete(objectKey).catch(() => undefined);
        }
        setAttachmentError(toErrorMessage(uploadError, "Impossible d'envoyer le fichier."));
      } finally {
        setUploadingAttachment(false);
        setAttachmentStatusLabel(null);
      }
    },
    [isWsConnected, selectedConversation, sendAction],
  );

  const handleCreateGroup = async (payload: {
    name: string;
    description: string | null;
    friendIds: string[];
  }) => {
    if (!user?.sub) {
      return;
    }

    setCreatingGroup(true);
    setCreateGroupError(null);

    try {
      const createdGroup = await groupApi.create({
        name: payload.name,
        description: payload.description,
        type: "PRIVATE",
      });

      const addResults = await Promise.allSettled(
        payload.friendIds.map((friendId) =>
          groupApi.addMember(createdGroup.id, { userId: friendId, role: "MEMBER" }),
        ),
      );

      const successfulMemberIds = payload.friendIds.filter(
        (_friendId, index) => addResults[index].status === "fulfilled",
      );

      const [canonicalGroup, canonicalMembers] = await Promise.all([
        groupApi.getById(createdGroup.id).catch(() => ({
          ...createdGroup,
          memberCount: Math.max(createdGroup.memberCount, 1 + successfulMemberIds.length),
        })),
        groupApi
          .getMembers(createdGroup.id)
          .catch(() =>
            [user.sub, ...successfulMemberIds].map((memberUserId) => ({
              groupId: createdGroup.id,
              userId: memberUserId,
              role: memberUserId === user.sub ? "OWNER" : "MEMBER",
              joinedAt: new Date().toISOString(),
            })),
          ),
      ]);

      const canonicalParticipantIds = Array.from(
        new Set(
          canonicalMembers
            .map((member) => member.userId)
            .filter(
              (memberId): memberId is string =>
                typeof memberId === "string" && memberId.trim().length > 0,
            ),
        ),
      );

      const groupConversationId = upsertGroupConversation(
        canonicalGroup,
        user.sub,
        canonicalParticipantIds,
      );

      if (groupConversationId) {
        await selectConversation(groupConversationId, user.sub);
        setMobileConversationOpen(true);
      }

      setCreateGroupOpen(false);
    } catch (createError) {
      setCreateGroupError(toErrorMessage(createError, "Impossible de creer le groupe."));
    } finally {
      setCreatingGroup(false);
    }
  };

  const openGroupMembers = useCallback(async () => {
    if (!user?.sub || !selectedConversation?.groupId) {
      return;
    }

    const groupId = selectedConversation.groupId;
    setMembersModalOpen(true);
    setMembersModalGroupId(groupId);
    setMembersModalGroupName(selectedConversation.title);
    setMembersModalLoading(true);
    setMembersModalError(null);
    setRemovingMemberIds(new Set());

    try {
      const [groupDetails, members] = await Promise.all([
        groupApi.getById(groupId),
        groupApi.getMembers(groupId),
      ]);

      const profileResults = await Promise.allSettled(
        members.map((member) => userApi.getById(member.userId)),
      );
      const profilesById: Record<string, UserProfile> = {};
      for (const profileResult of profileResults) {
        if (profileResult.status !== "fulfilled") {
          continue;
        }
        profilesById[profileResult.value.keycloakId] = profileResult.value;
      }

      setMembersModalOwnerId(groupDetails.ownerId);
      setMembersModalGroupName(groupDetails.name || selectedConversation.title);
      setMembersModalMembers(toMemberViewItems(members, profilesById, presenceByUserId));
    } catch (membersError) {
      setMembersModalError(
        toErrorMessage(membersError, "Impossible de charger les membres du groupe."),
      );
    } finally {
      setMembersModalLoading(false);
    }
  }, [presenceByUserId, selectedConversation, user?.sub]);

  const handleRemoveGroupMember = useCallback(
    async (memberUserId: string) => {
      if (!membersModalGroupId || !user?.sub || !canRemoveGroupMembers) {
        return;
      }

      setRemovingMemberIds((previous) => {
        const next = new Set(previous);
        next.add(memberUserId);
        return next;
      });

      try {
        await groupApi.removeMember(membersModalGroupId, memberUserId);
        removeGroupConversationParticipant(membersModalGroupId, memberUserId);
        setMembersModalMembers((previous) =>
          previous.filter((member) => member.userId !== memberUserId),
        );
      } catch (removeError) {
        setMembersModalError(
          toErrorMessage(removeError, "Impossible de retirer ce membre du groupe."),
        );
      } finally {
        setRemovingMemberIds((previous) => {
          const next = new Set(previous);
          next.delete(memberUserId);
          return next;
        });
      }
    },
    [canRemoveGroupMembers, membersModalGroupId, removeGroupConversationParticipant, user?.sub],
  );

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
          onRequestCreateGroup={() => {
            setCreateGroupError(null);
            setCreateGroupOpen(true);
          }}
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
        onClose={() => {
          if (!creatingGroup) {
            setCreateGroupOpen(false);
            setCreateGroupError(null);
          }
        }}
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
        onClose={() => {
          setMembersModalOpen(false);
          setMembersModalError(null);
          setMembersModalMembers([]);
          setMembersModalGroupId(null);
          setMembersModalOwnerId(null);
          setRemovingMemberIds(new Set());
        }}
      />
    </Layout>
  );
}
