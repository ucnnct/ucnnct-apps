import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X, Search, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { Link } from "react-router-dom";
import { useUserSearchStore } from "../../stores/userSearchStore";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const query = useUserSearchStore((state) => state.query);
  const results = useUserSearchStore((state) => state.results);
  const searching = useUserSearchStore((state) => state.searching);
  const showResults = useUserSearchStore((state) => state.showResults);
  const setQuery = useUserSearchStore((state) => state.setQuery);
  const setShowResults = useUserSearchStore((state) => state.setShowResults);
  const clear = useUserSearchStore((state) => state.clear);
  const search = useUserSearchStore((state) => state.search);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const displayName = user?.shortHandle ?? "User";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
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

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-secondary h-16">
      <div className="max-w-[1250px] mx-auto px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group w-[240px]">
          <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105">
            <img src="/uconnect.svg" alt="U-Connect" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-primary-900">
            U-Connect
          </span>
        </div>

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
          <button className="relative p-1 text-secondary-400 hover:text-primary-500 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-white"></span>
          </button>

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
          <MobileNavItem label="ACCUEIL" active />
          <MobileNavItem label="EXPLORER" />
          <MobileNavItem label="NOTIFICATIONS" />
          <MobileNavItem label="MESSAGES" />
        </div>
      )}
    </nav>
  );
}

function MobileNavItem({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`block text-xs font-medium tracking-wide uppercase ${
        active ? "text-primary-500" : "text-secondary-500"
      }`}
    >
      {label}
    </a>
  );
}
