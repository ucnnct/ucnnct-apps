import type { StateCreator } from "zustand";
import type { MessagesStoreState } from "./types";

type MessagesStateCreator = StateCreator<MessagesStoreState, [], [], MessagesStoreState>;

export type MessagesSet = Parameters<MessagesStateCreator>[0];
export type MessagesGet = Parameters<MessagesStateCreator>[1];

export interface MessagesHydrators {
  hydrateUsers: (userIds: string[]) => Promise<void>;
  hydrateGroups: (groupIds: string[]) => Promise<void>;
}
