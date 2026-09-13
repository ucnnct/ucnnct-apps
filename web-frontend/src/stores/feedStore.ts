import { create } from "zustand";

export type FeedTab = "recommended" | "activities" | "circles" | "friends";

interface FeedStoreState {
  activeTab: FeedTab;
  setActiveTab: (tab: FeedTab) => void;
}

export const useFeedStore = create<FeedStoreState>((set) => ({
  activeTab: "recommended",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
