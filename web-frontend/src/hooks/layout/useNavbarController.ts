import { useEffect, useRef, useState, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { useUserSearchStore } from "../../stores/userSearchStore";

interface UseNavbarControllerResult {
  isMenuOpen: boolean;
  isMobileSearchOpen: boolean;
  isNotificationsOpen: boolean;
  query: string;
  searching: boolean;
  showResults: boolean;
  results: ReturnType<typeof useUserSearchStore.getState>["results"];
  notifications: ReturnType<typeof useNotificationsStore.getState>["items"];
  unreadCount: number;
  notificationsLoading: boolean;
  userId: string | null;
  avatarUrl: string | null;
  fullName: string;
  displayName: string;
  locationPathname: string;
  searchRef: RefObject<HTMLDivElement | null>;
  mobileSearchRef: RefObject<HTMLDivElement | null>;
  notificationsRef: RefObject<HTMLDivElement | null>;
  handleSearch: (value: string) => void;
  handleSearchResultSelected: () => void;
  toggleMenu: () => void;
  toggleMobileSearch: () => void;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  logout: () => void;
  handleNotificationClick: (
    notificationId: string,
    isRead: boolean,
    destination: string,
  ) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

export function useNavbarController(): UseNavbarControllerResult {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const query = useUserSearchStore((state) => state.query);
  const results = useUserSearchStore((state) => state.results);
  const searching = useUserSearchStore((state) => state.searching);
  const showResults = useUserSearchStore((state) => state.showResults);
  const setQuery = useUserSearchStore((state) => state.setQuery);
  const setShowResults = useUserSearchStore((state) => state.setShowResults);
  const clear = useUserSearchStore((state) => state.clear);
  const search = useUserSearchStore((state) => state.search);

  const notifications = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const notificationsLoading = useNotificationsStore((state) => state.loading);
  const bootstrapNotifications = useNotificationsStore((state) => state.bootstrap);
  const markNotificationAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllNotificationsAsReadStore = useNotificationsStore((state) => state.markAllAsRead);
  const resetNotifications = useNotificationsStore((state) => state.reset);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktopSearch = Boolean(searchRef.current?.contains(target));
      const clickedMobileSearch = Boolean(mobileSearchRef.current?.contains(target));

      if (!clickedDesktopSearch && !clickedMobileSearch) {
        setShowResults(false);
        setIsMobileSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [setShowResults]);

  useEffect(() => {
    if (!user?.sub) {
      resetNotifications();
      return;
    }
    void bootstrapNotifications(user.sub);
  }, [bootstrapNotifications, resetNotifications, user?.sub]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
    setShowResults(false);
  }, [location.pathname, setShowResults]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      clear();
      return;
    }

    setShowResults(true);
    debounceRef.current = setTimeout(() => {
      void search(value);
    }, 300);
  };

  const handleSearchResultSelected = () => {
    setShowResults(false);
    setIsMobileSearchOpen(false);
    clear();
  };

  const toggleMenu = () => {
    setIsMenuOpen((open) => !open);
  };

  const toggleMobileSearch = () => {
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileSearchOpen((open) => {
      const nextOpen = !open;
      if (nextOpen && query.trim()) {
        setShowResults(true);
      }
      if (!nextOpen) {
        setShowResults(false);
      }
      return nextOpen;
    });
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen((open) => !open);
  };

  const closeNotifications = () => {
    setIsNotificationsOpen(false);
  };

  const handleNotificationClick = async (
    notificationId: string,
    isRead: boolean,
    destination: string,
  ) => {
    if (user?.sub && !isRead) {
      await markNotificationAsRead(user.sub, notificationId);
    }
    setIsNotificationsOpen(false);
    navigate(destination);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user?.sub) {
      return;
    }
    await markAllNotificationsAsReadStore(user.sub);
  };

  return {
    isMenuOpen,
    isMobileSearchOpen,
    isNotificationsOpen,
    query,
    searching,
    showResults,
    results,
    notifications,
    unreadCount,
    notificationsLoading,
    userId: user?.sub ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    fullName: user?.fullName ?? "User",
    displayName: user?.shortHandle ?? "User",
    locationPathname: location.pathname,
    searchRef,
    mobileSearchRef,
    notificationsRef,
    handleSearch,
    handleSearchResultSelected,
    toggleMenu,
    toggleMobileSearch,
    toggleNotifications,
    closeNotifications,
    logout,
    handleNotificationClick,
    markAllNotificationsAsRead,
  };
}
