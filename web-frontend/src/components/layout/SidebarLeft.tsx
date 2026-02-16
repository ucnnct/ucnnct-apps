import {
  Home,
  Compass,
  Bell,
  MessageSquare,
  Users,
  Bookmark,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import SectionHeader from "../common/SectionHeader";
import { useAuth } from "../../auth/AuthProvider";

export default function SidebarLeft() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-full bg-white border-r border-secondary-100 shrink-0">
      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        <nav className="space-y-8">
          <div>
            <div className="space-y-1">
              <SidebarLink
                to="/"
                icon={<Home size={20} />}
                label="Accueil"
                active={location.pathname === "/"}
              />
              <SidebarLink
                to="/explorer"
                icon={<Compass size={20} />}
                label="Explorer"
                active={location.pathname === "/explorer"}
              />
              <SidebarLink
                to="/notifications"
                icon={<Bell size={20} />}
                label="Notifications"
                active={location.pathname === "/notifications"}
              />
              <SidebarLink
                to="/messages"
                icon={<MessageSquare size={20} />}
                label="Messages"
                active={location.pathname === "/messages"}
              />
            </div>
          </div>

          <div>
            <SectionHeader />
            <div className="space-y-1">
              <SidebarLink
                to="/cercles"
                icon={<Users size={20} />}
                label="Mes Cercles"
                active={location.pathname === "/cercles"}
              />
              <SidebarLink
                to="/ressources"
                icon={<Bookmark size={20} />}
                label="Ressources"
                active={location.pathname === "/ressources"}
              />
              <SidebarLink
                to="/profile"
                icon={<User size={20} />}
                label="Mon Profil"
                active={location.pathname.startsWith("/profile")}
              />
            </div>
          </div>
        </nav>
      </div>

      <div className="px-6 py-3 border-t border-secondary-100 bg-secondary-50/20">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 avatar-sharp">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName ?? "User")}`}
              alt="Profile"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary-900 text-sm truncate">
              {user?.fullName ?? "Utilisateur"}
            </p>
            <p className="text-[11px] font-normal text-secondary-400 truncate">
              @{user?.shortHandle ?? "user"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  active = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}
    >
      <span className={`${active ? "text-primary-500" : "text-secondary-400"}`}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
