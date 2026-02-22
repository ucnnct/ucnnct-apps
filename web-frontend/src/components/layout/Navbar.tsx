import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Home,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUserSearchStore } from "../../stores/userSearchStore";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { buildNotificationDestination } from "../../notifications/navigation";
import {
  formatNotificationCategory,
  formatNotificationContent,
  formatNotificationDate,
} from "../notifications/utils";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  const markAllNotificationsAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const resetNotifications = useNotificationsStore((state) => state.reset);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const displayName = user?.shortHandle ?? "User";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
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
  }, [location.pathname]);

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

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-secondary h-16">
      <div className="max-w-[1250px] mx-auto px-8 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 cursor-pointer group w-[240px]">
          <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105">
            <img src="/uconnect.svg" alt="U-Connect" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-primary-900">
            U-Connect
          </span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-lg mx-12">
          <div className="w-full relative group" ref={searchRef}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500 text-secondary-400">
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.trim() && setShowResults(true)}
              placeholder="Rechercher sur le campus..."
              className="block w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-full py-2.5 pl-12 pr-4 text-xs font-normal tracking-normal transition-all placeholder:text-secondary-300"
            />
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-secondary-100 rounded-sm shadow-lg overflow-hidden z-50">
                {searching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary-300" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="text-[11px] font-normal text-secondary-400 p-4 text-center">Aucun resultat</p>
                ) : (
                  results.map((u) => {
                    const fullName = `${u.firstName} ${u.lastName}`.trim();
                    const handle = u.username.includes("@")
                      ? u.firstName || u.email.split("@")[0]
                      : u.username;

                    return (
                      <Link
                        key={u.keycloakId}
                        to={`/profile/${u.keycloakId}`}
                        onClick={() => {
                          setShowResults(false);
                          clear();
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors"
                      >
                        <div className="w-8 h-8 avatar-sharp shrink-0">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
                            }
                            alt={fullName}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary-900 truncate">{fullName}</p>
                          <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 justify-end w-[240px]">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative p-1 text-secondary-400 hover:text-primary-500 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary-500 text-white text-[10px] leading-4 text-center border border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[360px] bg-white border border-secondary-100 rounded-sm shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
                  <p className="text-sm font-semibold text-primary-900">Notifications</p>
                  <button
                    disabled={!user?.sub || unreadCount === 0}
                    onClick={() => user?.sub && void markAllNotificationsAsRead(user.sub)}
                    className="text-[11px] text-primary-500 hover:text-primary-700 disabled:text-secondary-300 disabled:cursor-not-allowed"
                  >
                    Tout lire
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto no-scrollbar">
                  {notificationsLoading && notifications.length === 0 && (
                    <p className="p-4 text-xs text-secondary-400">Chargement...</p>
                  )}
                  {!notificationsLoading && notifications.length === 0 && (
                    <p className="p-4 text-xs text-secondary-400">Aucune notification</p>
                  )}

                  {notifications.slice(0, 8).map((item) => {
                    const isRead =
                      Boolean(item.readAt) || String(item.status).toUpperCase() === "READ";
                    const destination = buildNotificationDestination(item, user?.sub ?? null);
                    const content = formatNotificationContent(item);
                    const categoryLabel = formatNotificationCategory(item.category);
                    return (
                      <button
                        key={item.notificationId}
                        onClick={() =>
                          void handleNotificationClick(
                            item.notificationId,
                            isRead,
                            destination,
                          )
                        }
                        className={`w-full text-left px-4 py-3 border-b border-secondary-50 last:border-b-0 hover:bg-secondary-50 transition-colors ${
                          isRead ? "bg-white" : "bg-primary-50/30"
                        }`}
                      >
                        <p className="text-xs text-primary-900 break-words">{content}</p>
                        <p className="text-[11px] text-secondary-400 mt-1">
                          {categoryLabel} - {formatNotificationDate(item.createdAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <Link
                  to="/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="block text-center text-xs font-medium text-primary-500 hover:bg-secondary-50 px-4 py-3 border-t border-secondary-100"
                >
                  Voir toutes les notifications
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="h-8 w-8 avatar-sharp group-hover:border-primary-500 transition-all">
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName ?? "User")}`
                }
                alt="User"
              />
            </div>
            <span className="text-xs font-medium text-primary-900 hidden lg:block group-hover:text-primary-500 transition-colors">
              {displayName}
            </span>
          </div>

          <button
            onClick={logout}
            title="Se deconnecter"
            className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>

          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-primary-900 transition-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-white border-b border-secondary absolute w-full py-6 px-8 space-y-4 shadow-xl">
          <MobileNavItem
            to="/"
            label="Accueil"
            icon={<Home size={16} />}
            active={location.pathname === "/"}
          />
          <MobileNavItem
            to="/messages"
            label="Messages"
            icon={<MessageSquare size={16} />}
            active={location.pathname.startsWith("/messages")}
          />
          <MobileNavItem
            to="/notifications"
            label="Notifications"
            icon={<Bell size={16} />}
            active={location.pathname.startsWith("/notifications")}
          />
          <MobileNavItem
            to="/cercles"
            label="Cercles"
            icon={<Users size={16} />}
            active={location.pathname.startsWith("/cercles")}
          />
          <MobileNavItem
            to="/friend-requests"
            label="Demandes d'amis"
            icon={<UserPlus size={16} />}
            active={location.pathname.startsWith("/friend-requests")}
          />
          <MobileNavItem
            to="/profile"
            label="Mon profil"
            icon={<User size={16} />}
            active={location.pathname.startsWith("/profile")}
          />
        </div>
      )}
    </nav>
  );
}

function MobileNavItem({
  to,
  label,
  icon,
  active = false,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 text-sm font-medium ${
        active ? "text-primary-600" : "text-secondary-600"
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
