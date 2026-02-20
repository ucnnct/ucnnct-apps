import { create } from "zustand";
import { userApi, type UserProfile } from "../api/users";

interface UserSearchStoreState {
  query: string;
  searching: boolean;
  showResults: boolean;
  results: UserProfile[];
  setQuery: (value: string) => void;
  setShowResults: (visible: boolean) => void;
  clear: () => void;
  search: (value: string) => Promise<void>;
}

let activeSearchId = 0;

export const useUserSearchStore = create<UserSearchStoreState>((set) => ({
  query: "",
  searching: false,
  showResults: false,
  results: [],

  setQuery: (value) => {
    set({ query: value });
  },

  setShowResults: (visible) => {
    set({ showResults: visible });
  },

  clear: () => {
    set({
      query: "",
      searching: false,
      showResults: false,
      results: [],
    });
  },

  search: async (value: string) => {
    const term = value.trim();
    if (!term) {
      set({
        searching: false,
        showResults: false,
        results: [],
      });
      return;
    }

    const searchId = ++activeSearchId;
    set({ searching: true, showResults: true });

    try {
      const users = await userApi.search(term);
      if (searchId !== activeSearchId) {
        return;
      }
      set({ results: users.slice(0, 8) });
    } catch {
      if (searchId !== activeSearchId) {
        return;
      }
      set({ results: [] });
    } finally {
      if (searchId === activeSearchId) {
        set({ searching: false });
      }
    }
  },
}));
