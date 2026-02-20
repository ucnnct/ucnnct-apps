import { create } from "zustand";
import { friendApi, type Friendship } from "../api/friends";
import { userApi, type UserProfile } from "../api/users";

interface NetworkStoreState {
  loading: boolean;
  friends: UserProfile[];
  received: Friendship[];
  sent: Friendship[];
  suggestions: UserProfile[];
  sentIds: Set<string>;
  activeUserId: string | null;
  load: (authUserId: string, force?: boolean) => Promise<void>;
  sendRequest: (keycloakId: string) => Promise<void>;
  acceptRequest: (requesterId: string, authUserId: string) => Promise<void>;
  rejectRequest: (requesterId: string, authUserId: string) => Promise<void>;
  removeFriend: (friendId: string, authUserId: string) => Promise<void>;
}

let loadPromise: Promise<void> | null = null;

function buildSuggestions(
  authUserId: string,
  allUsers: UserProfile[],
  friends: UserProfile[],
  sent: Friendship[],
  received: Friendship[],
): { suggestions: UserProfile[]; sentIds: Set<string> } {
  const friendIds = new Set(friends.map((user) => user.keycloakId));
  const sentIds = new Set(sent.map((req) => req.receiver.keycloakId));
  const pendingIds = new Set(received.map((req) => req.requester.keycloakId));
  const excludedIds = new Set([authUserId, ...friendIds, ...sentIds, ...pendingIds]);
  const suggestions = allUsers.filter((user) => !excludedIds.has(user.keycloakId));
  return { suggestions, sentIds };
}

export const useNetworkStore = create<NetworkStoreState>((set, get) => ({
  loading: false,
  friends: [],
  received: [],
  sent: [],
  suggestions: [],
  sentIds: new Set<string>(),
  activeUserId: null,

  load: async (authUserId: string, force = false) => {
    if (!authUserId) {
      return;
    }
    const sameUser = get().activeUserId === authUserId;
    if (!force && sameUser && !get().loading) {
      return;
    }
    if (loadPromise) {
      return loadPromise;
    }

    set({ loading: true });

    loadPromise = Promise.all([
      friendApi.getMyFriends(),
      friendApi.getPendingRequests(),
      friendApi.getSentRequests(),
      userApi.getAll(),
    ])
      .then(([friends, received, sent, allUsers]) => {
        const { suggestions, sentIds } = buildSuggestions(
          authUserId,
          allUsers,
          friends,
          sent,
          received,
        );
        set({
          activeUserId: authUserId,
          friends,
          received,
          sent,
          suggestions,
          sentIds,
        });
      })
      .finally(() => {
        set({ loading: false });
        loadPromise = null;
      });

    return loadPromise;
  },

  sendRequest: async (keycloakId: string) => {
    await friendApi.sendRequest(keycloakId);
    set((state) => {
      const nextSentIds = new Set(state.sentIds);
      nextSentIds.add(keycloakId);
      return {
        sentIds: nextSentIds,
        suggestions: state.suggestions.filter((user) => user.keycloakId !== keycloakId),
      };
    });
  },

  acceptRequest: async (requesterId: string, authUserId: string) => {
    await friendApi.accept(requesterId);
    await get().load(authUserId, true);
  },

  rejectRequest: async (requesterId: string, authUserId: string) => {
    await friendApi.reject(requesterId);
    await get().load(authUserId, true);
  },

  removeFriend: async (friendId: string, authUserId: string) => {
    await friendApi.remove(friendId);
    await get().load(authUserId, true);
  },
}));
