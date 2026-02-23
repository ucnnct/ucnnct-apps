import { Bell, Home, MessageSquare, User, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface MobileNavMenuProps {
  open: boolean;
  pathname: string;
}

export default function MobileNavMenu({ open, pathname }: MobileNavMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="lg:hidden bg-white border-b border-secondary absolute w-full py-6 px-8 space-y-4 shadow-xl">
      <MobileNavItem
        to="/"
        label="Accueil"
        icon={<Home size={16} />}
        active={pathname === "/"}
      />
      <MobileNavItem
        to="/messages"
        label="Messages"
        icon={<MessageSquare size={16} />}
        active={pathname.startsWith("/messages")}
      />
      <MobileNavItem
        to="/notifications"
        label="Notifications"
        icon={<Bell size={16} />}
        active={pathname.startsWith("/notifications")}
      />
      <MobileNavItem
        to="/cercles"
        label="Cercles"
        icon={<Users size={16} />}
        active={pathname.startsWith("/cercles")}
      />
      <MobileNavItem
        to="/friend-requests"
        label="Demandes d'amis"
        icon={<UserPlus size={16} />}
        active={pathname.startsWith("/friend-requests")}
      />
      <MobileNavItem
        to="/profile"
        label="Mon profil"
        icon={<User size={16} />}
        active={pathname.startsWith("/profile")}
      />
    </div>
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
  icon: ReactNode;
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
