import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UserProfile } from "../../api/users";

export function ToggleButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wide uppercase transition-all ${
        active ? "bg-white text-primary-500 shadow-sm" : "text-secondary-400 hover:text-secondary-600"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="w-4 h-4 flex items-center justify-center bg-primary-500 text-white text-[9px] font-medium rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

export function UserCard({
  user,
  children,
}: {
  user: UserProfile;
  children: ReactNode;
}) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const handle = user.username.includes("@")
    ? user.firstName || user.email.split("@")[0]
    : user.username;
  const detail = [user.fieldOfStudy, user.university].filter(Boolean).join(" · ");

  return (
    <div className="border border-secondary-100 rounded-sm overflow-hidden hover:shadow-md transition-all group">
      <div className="h-16 bg-secondary-100 relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary-500/10 to-secondary-200/30" />
        <div className="absolute -bottom-5 left-4">
          <div className="w-14 h-14 bg-white p-0.5 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
            <img
              src={
                user.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
              }
              alt={fullName}
              className="w-full h-full object-cover rounded-sm"
            />
          </div>
        </div>
      </div>

      <div className="pt-8 px-4 pb-4">
        <Link to={`/profile/${user.keycloakId}`} className="block mb-3 group/link">
          <p className="text-sm font-semibold text-primary-900 truncate group-hover/link:text-primary-500 transition-colors">
            {fullName}
          </p>
          <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
        </Link>

        {detail && <p className="text-[11px] font-normal text-secondary-400 mb-2 truncate">{detail}</p>}

        {user.bio && <p className="text-sm font-normal text-secondary-500 leading-relaxed mb-3 line-clamp-2">{user.bio}</p>}

        {children}
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
      <p className="text-xs font-normal text-secondary-300">{text}</p>
    </div>
  );
}
