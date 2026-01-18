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

export default function SidebarLeft() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-full bg-white border-r border-secondary-100 flex-shrink-0">
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
                active={location.pathname === "/profile"}
              />
            </div>
          </div>
        </nav>
      </div>

      <div className="p-6 border-t border-secondary-100 bg-secondary-50/20">
        <div className="flex items-center gap-3 mb-6 group cursor-pointer">
          <div className="w-10 h-10 avatar-sharp">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michel%20Eloka"
              alt="Profile"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-primary-900 text-xs uppercase truncate tracking-tight">
              Michel Eloka
            </p>
            <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest truncate">
              @MICHEL_ELK
            </p>
          </div>
        </div>
        {/* <button className="btn-primary w-full text-xs">
          <Plus
            size={16}
            strokeWidth={4}
            className="group-hover:rotate-90 transition-transform"
          />
          <span>Nouveau Post</span>
        </button> */}
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
