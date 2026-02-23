import { useCallback, useEffect, useMemo, useState } from "react";
import { groupApi, type GroupSummary } from "../../api/groups";
import { userApi, type UserProfile } from "../../api/users";
import type { GroupMemberViewItem } from "../../components/messages";
import { toErrorMessage } from "../../components/messages/utils";
import type { GroupDirectoryEntry, MessageConversationItem } from "../../stores/messagesStore";
import { toMemberViewItems } from "./memberUtils";

interface UseGroupConversationModalsArgs {
  userId: string | null;
  selectedConversation: MessageConversationItem | null;
  presenceByUserId: Record<string, boolean>;
  groupDirectory: Record<string, GroupDirectoryEntry>;
  upsertGroupConversation: (
    group: GroupSummary,
    authUserId: string,
    participantIds?: string[],
  ) => string | null;
  selectConversation: (conversationId: string, authUserId: string) => Promise<void>;
  removeGroupConversationParticipant: (groupId: string, userId: string) => void;
  openConversationOnMobile: () => void;
}

interface CreateGroupPayload {
  name: string;
  description: string | null;
  friendIds: string[];
}

interface UseGroupConversationModalsResult {
  createGroupOpen: boolean;
  creatingGroup: boolean;
  createGroupError: string | null;
  membersModalOpen: boolean;
  membersModalLoading: boolean;
  membersModalError: string | null;
  membersModalGroupName: string;
  membersModalMembers: GroupMemberViewItem[];
  removingMemberIds: Set<string>;
  canRemoveGroupMembers: boolean;
  openCreateGroup: () => void;
  closeCreateGroup: () => void;
  handleCreateGroup: (payload: CreateGroupPayload) => Promise<void>;
  openGroupMembers: () => Promise<void>;
  closeGroupMembers: () => void;
  handleRemoveGroupMember: (memberUserId: string) => Promise<void>;
}

export function useGroupConversationModals({
  userId,
  selectedConversation,
  presenceByUserId,
  groupDirectory,
  upsertGroupConversation,
  selectConversation,
  removeGroupConversationParticipant,
  openConversationOnMobile,
}: UseGroupConversationModalsArgs): UseGroupConversationModalsResult {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersModalLoading, setMembersModalLoading] = useState(false);
  const [membersModalError, setMembersModalError] = useState<string | null>(null);
  const [membersModalGroupId, setMembersModalGroupId] = useState<string | null>(null);
  const [membersModalGroupName, setMembersModalGroupName] = useState("");
  const [membersModalOwnerId, setMembersModalOwnerId] = useState<string | null>(null);
  const [membersModalMembers, setMembersModalMembers] = useState<GroupMemberViewItem[]>([]);
  const [removingMemberIds, setRemovingMemberIds] = useState<Set<string>>(new Set());

  const canRemoveGroupMembers = useMemo(
    () =>
      Boolean(
        userId &&
          (membersModalOwnerId
            ? membersModalOwnerId === userId
            : selectedConversation?.kind === "group" &&
              selectedConversation.groupId &&
              groupDirectory[selectedConversation.groupId]?.ownerId === userId),
      ),
    [groupDirectory, membersModalOwnerId, selectedConversation, userId],
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

  const openCreateGroup = useCallback(() => {
    setCreateGroupError(null);
    setCreateGroupOpen(true);
  }, []);

  const closeCreateGroup = useCallback(() => {
    if (creatingGroup) {
      return;
    }
    setCreateGroupOpen(false);
    setCreateGroupError(null);
  }, [creatingGroup]);

  const handleCreateGroup = useCallback(
    async (payload: CreateGroupPayload) => {
      if (!userId) {
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
              [userId, ...successfulMemberIds].map((memberUserId) => ({
                groupId: createdGroup.id,
                userId: memberUserId,
                role: memberUserId === userId ? "OWNER" : "MEMBER",
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
          userId,
          canonicalParticipantIds,
        );

        if (groupConversationId) {
          await selectConversation(groupConversationId, userId);
          openConversationOnMobile();
        }

        setCreateGroupOpen(false);
      } catch (createError) {
        setCreateGroupError(toErrorMessage(createError, "Impossible de creer le groupe."));
      } finally {
        setCreatingGroup(false);
      }
    },
    [openConversationOnMobile, selectConversation, upsertGroupConversation, userId],
  );

  const openGroupMembers = useCallback(async () => {
    if (!userId || !selectedConversation?.groupId) {
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
  }, [presenceByUserId, selectedConversation, userId]);

  const closeGroupMembers = useCallback(() => {
    setMembersModalOpen(false);
    setMembersModalError(null);
    setMembersModalMembers([]);
    setMembersModalGroupId(null);
    setMembersModalOwnerId(null);
    setRemovingMemberIds(new Set());
  }, []);

  const handleRemoveGroupMember = useCallback(
    async (memberUserId: string) => {
      if (!membersModalGroupId || !userId || !canRemoveGroupMembers) {
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
    [canRemoveGroupMembers, membersModalGroupId, removeGroupConversationParticipant, userId],
  );

  return {
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
  };
}
