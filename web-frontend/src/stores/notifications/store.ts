import { create } from "zustand";
import { notificationsApi } from "../../api/notifications";
import {
  countUnread,
  isNonBlank,
  isRead,
  mergeNotifications,
  normalizeNotification,
  normalizePageResponse,
} from "./utils";
import type { NotificationsStoreState } from "./types";

const DEFAULT_PAGE_SIZE = 20;

let bootstrapPromise: Promise<void> | null = null;
let loadMorePromise: Promise<void> | null = null;

export const useNotificationsStore = create<NotificationsStoreState>((set, get) => ({
  activeUserId: null,
  loading: false,
  loadingMore: false,
  items: [],
  unreadCount: 0,
  hasMore: false,
  nextCursor: null,
  error: null,

  bootstrap: async (userId, force = false) => {
    if (!isNonBlank(userId)) {
      return;
    }

    const state = get();
    const alreadyLoaded = state.activeUserId === userId && state.items.length > 0;
    if (!force && alreadyLoaded && !state.loading) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    set({
      loading: true,
      error: null,
      activeUserId: userId,
      ...(force ? { items: [], unreadCount: 0, hasMore: false, nextCursor: null } : {}),
    });

    bootstrapPromise = notificationsApi
      .getMine(userId, DEFAULT_PAGE_SIZE)
      .then((page) => {
        const items = normalizePageResponse(page);
        set({
          activeUserId: userId,
          items,
          unreadCount: countUnread(items),
          hasMore: Boolean(page.hasMore),
          nextCursor: page.nextCursor ?? null,
          error: null,
        });
      })
      .catch(() => {
        set({
          activeUserId: userId,
          items: [],
          unreadCount: 0,
          hasMore: false,
          nextCursor: null,
          error: "Impossible de charger les notifications.",
        });
      })
      .finally(() => {
        set({ loading: false });
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  },

  loadMore: async (userId) => {
    const state = get();
    if (
      !isNonBlank(userId) ||
      state.activeUserId !== userId ||
      !state.hasMore ||
      !isNonBlank(state.nextCursor) ||
      state.loadingMore
    ) {
      return;
    }

    if (loadMorePromise) {
      return loadMorePromise;
    }

    set({ loadingMore: true, error: null });

    loadMorePromise = notificationsApi
      .getMine(userId, DEFAULT_PAGE_SIZE, state.nextCursor)
      .then((page) => {
        const incoming = normalizePageResponse(page);
        set((current) => {
          const merged = mergeNotifications(current.items, incoming);
          return {
            items: merged,
            unreadCount: countUnread(merged),
            hasMore: Boolean(page.hasMore),
            nextCursor: page.nextCursor ?? null,
            error: null,
          };
        });
      })
      .catch(() => {
        set({ error: "Impossible de charger plus de notifications." });
      })
      .finally(() => {
        set({ loadingMore: false });
        loadMorePromise = null;
      });

    return loadMorePromise;
  },

  ingestInApp: (payload) => {
    const activeUserId = get().activeUserId;
    if (
      activeUserId &&
      isNonBlank(payload.ownerUserId) &&
      payload.ownerUserId !== activeUserId
    ) {
      return;
    }

    const normalized = normalizeNotification({
      notificationId: payload.notificationId,
      ownerUserId: payload.ownerUserId,
      targetId: payload.targetId,
      category: payload.category,
      content: payload.content,
      status: payload.status,
      createdAt: payload.createdAt ?? Date.now(),
      readAt: payload.readAt ?? null,
    });

    if (!normalized) {
      return;
    }

    set((state) => {
      const merged = mergeNotifications(state.items, [normalized]);
      return {
        items: merged,
        unreadCount: countUnread(merged),
      };
    });
  },

  markAsRead: async (userId, notificationId) => {
    if (!isNonBlank(userId) || !isNonBlank(notificationId)) {
      return;
    }

    const now = Date.now();
    set((state) => {
      const nextItems = state.items.map((item) =>
        item.notificationId === notificationId
          ? { ...item, status: "READ", readAt: item.readAt ?? now }
          : item,
      );
      return {
        items: nextItems,
        unreadCount: countUnread(nextItems),
        error: null,
      };
    });

    try {
      await notificationsApi.markAsRead(userId, notificationId);
    } catch {
      set({ error: "Impossible de marquer la notification comme lue." });
    }
  },

  markAllAsRead: async (userId) => {
    if (!isNonBlank(userId)) {
      return;
    }

    const now = Date.now();
    set((state) => {
      const nextItems = state.items.map((item) =>
        isRead(item) ? item : { ...item, status: "READ", readAt: now },
      );
      return {
        items: nextItems,
        unreadCount: 0,
        error: null,
      };
    });

    try {
      await notificationsApi.markAllAsRead(userId);
    } catch {
      set({ error: "Impossible de marquer toutes les notifications comme lues." });
    }
  },

  reset: () => {
    bootstrapPromise = null;
    loadMorePromise = null;
    set({
      activeUserId: null,
      loading: false,
      loadingMore: false,
      items: [],
      unreadCount: 0,
      hasMore: false,
      nextCursor: null,
      error: null,
    });
  },
}));
