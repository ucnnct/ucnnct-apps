import { Bell, Loader2, LogOut, Menu, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import SearchResultsDropdown from "./navbar/SearchResultsDropdown";
import NotificationsPopover from "./navbar/NotificationsPopover";
import MobileNavMenu from "./navbar/MobileNavMenu";
import { useNavbarController } from "../../hooks/layout/useNavbarController";

export default function Navbar() {
  const {
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
    userId,
    avatarUrl,
    fullName,
    displayName,
    locationPathname,
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
  } = useNavbarController();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-secondary h-16 relative">
      <div className="max-w-[1250px] mx-auto px-8 h-full flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group w-auto md:w-[240px] shrink-0"
        >
          <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105">
            <img src="/uconnect.svg" alt="U-Connect" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-base sm:text-lg md:text-xl tracking-tight text-primary-900 whitespace-nowrap leading-none">
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
              onChange={(event) => handleSearch(event.target.value)}
              onFocus={() => query.trim() && handleSearch(query)}
              placeholder="Rechercher sur le campus..."
              className="block w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-full py-2.5 pl-12 pr-4 text-xs font-normal tracking-normal transition-all placeholder:text-secondary-300"
            />
            <SearchResultsDropdown
              showResults={showResults}
              searching={searching}
              results={results}
              onSelectResult={handleSearchResultSelected}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-secondary-100 rounded-sm shadow-lg overflow-hidden z-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 justify-end w-auto md:w-[240px]">
          <button
            onClick={toggleMobileSearch}
            title="Rechercher sur le campus"
            className="relative p-1 text-secondary-400 hover:text-primary-500 transition-colors md:hidden"
          >
            <Search size={20} />
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-1 text-secondary-400 hover:text-primary-500 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary-500 text-white text-[10px] leading-4 text-center border border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationsPopover
              open={isNotificationsOpen}
              notifications={notifications}
              unreadCount={unreadCount}
              notificationsLoading={notificationsLoading}
              userId={userId}
              onClose={closeNotifications}
              onMarkAllRead={markAllNotificationsAsRead}
              onNotificationClick={handleNotificationClick}
            />
          </div>

          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="h-8 w-8 avatar-sharp group-hover:border-primary-500 transition-all">
              <img
                src={
                  avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
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
            <button onClick={toggleMenu} className="p-2 text-primary-900 transition-none">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div
          className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-secondary shadow-lg z-40"
          ref={mobileSearchRef}
        >
          <div className="px-4 py-3">
            <div className="w-full relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500 text-secondary-400">
                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                onFocus={() => query.trim() && handleSearch(query)}
                placeholder="Rechercher sur le campus..."
                className="block w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-full py-2.5 pl-12 pr-4 text-xs font-normal tracking-normal transition-all placeholder:text-secondary-300"
              />
              <SearchResultsDropdown
                showResults={showResults}
                searching={searching}
                results={results}
                onSelectResult={handleSearchResultSelected}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-secondary-100 rounded-sm shadow-lg overflow-hidden z-50 max-h-[45vh] overflow-y-auto"
              />
            </div>
          </div>
        </div>
      )}

      <MobileNavMenu open={isMenuOpen} pathname={locationPathname} />
    </nav>
  );
}
