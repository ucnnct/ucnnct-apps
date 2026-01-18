import { useState } from "react";
import { Bell, Menu, X, Search, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const displayName = user?.preferredUsername?.toUpperCase() ?? "USER";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-secondary h-16">
      <div className="max-w-[1250px] mx-auto px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group w-[240px]">
          <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105">
            <img
              src="/uconnect.svg"
              alt="U-Connect"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display font-black text-xl tracking-tighter text-primary-900 uppercase">
            U-Connect
          </span>
        </div>

        <div className="hidden md:flex flex-1 max-w-lg mx-12">
          <div className="w-full relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500 text-secondary-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="RECHERCHER SUR LE CAMPUS..."
              className="block w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-full py-2.5 pl-12 pr-4 text-[10px] font-black tracking-widest uppercase transition-all placeholder:text-secondary-300"
            />
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
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName ?? "User")}`}
                alt="User"
              />
            </div>
            <span className="text-[10px] font-black text-primary-900 tracking-widest hidden lg:block group-hover:text-primary-500 transition-colors uppercase">
              {displayName}
            </span>
          </div>

          <button
            onClick={logout}
            title="Se déconnecter"
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
      className={`block text-xs font-black tracking-[0.2em] ${
        active ? "text-primary-500" : "text-secondary-500"
      }`}
    >
      {label}
    </a>
  );
}
