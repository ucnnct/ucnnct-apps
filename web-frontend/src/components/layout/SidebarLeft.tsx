import {
  Home,
  Compass,
  Bell,
  MessageSquare,
  Users,
  Bookmark,
  User,
  Plus,
  Search,
} from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function SidebarLeft() {
  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-full bg-white border-r border-secondary-100 shrink-0">
      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        <nav className="space-y-8">
          <div>
            <div className="space-y-1">
              <SidebarLink icon={<Home size={20} />} label="Accueil" active />
              <SidebarLink icon={<Compass size={20} />} label="Explorer" />
              <SidebarLink icon={<Bell size={20} />} label="Notifications" />
              <SidebarLink
                icon={<MessageSquare size={20} />}
                label="Messages"
              />
            </div>
          </div>

          <div>
            <SectionHeader />
            <div className="space-y-1">
              <SidebarLink icon={<Users size={20} />} label="Mes Cercles" />
              <SidebarLink icon={<Bookmark size={20} />} label="Ressources" />
              <SidebarLink icon={<User size={20} />} label="Mon Portfolio" />
            </div>
          </div>
        </nav>
      </div>

      {/* <div className="p-6 border-t border-secondary-100 bg-secondary-50/20">
        <button className="w-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-black uppercase tracking-widest py-4 rounded-sm transition-all flex items-center justify-center gap-2 group">
          <Plus size={16} strokeWidth={4} className="group-hover:rotate-90 transition-transform" />
          <span>Nouveau Post</span>
        </button>
      </div> */}
    </aside>
  );
}

function SidebarLink({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`flex items-center px-8 py-3 transition-all relative border-l-2 ${
        active
          ? "text-primary-500 border-primary-500 bg-primary-50/30"
          : "text-secondary-600 border-transparent hover:text-primary-900 hover:bg-secondary-50"
      }`}
    >
      <span className={`${active ? "text-primary-500" : "text-secondary-400"}`}>
        {icon}
      </span>
      <span
        className={`ml-4 text-sm font-bold tracking-tight ${active ? "text-primary-900" : ""}`}
      >
        {label}
      </span>
    </a>
  );
}
