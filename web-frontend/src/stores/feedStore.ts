import { create } from "zustand";

export type FeedTab = "discover" | "events";

interface FeedStoreState {
  activeTab: FeedTab;
  setActiveTab: (tab: FeedTab) => void;
}

export const useFeedStore = create<FeedStoreState>((set) => ({
  activeTab: "discover",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
