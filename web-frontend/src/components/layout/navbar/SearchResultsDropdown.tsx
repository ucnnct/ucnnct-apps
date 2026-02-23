import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { UserProfile } from "../../../api/users";

interface SearchResultsDropdownProps {
  showResults: boolean;
  searching: boolean;
  results: UserProfile[];
  className: string;
  onSelectResult: () => void;
}

export default function SearchResultsDropdown({
  showResults,
  searching,
  results,
  className,
  onSelectResult,
}: SearchResultsDropdownProps) {
  if (!showResults) {
    return null;
  }

  return (
    <div className={className}>
      {searching ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-secondary-300" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-[11px] font-normal text-secondary-400 p-4 text-center">Aucun resultat</p>
      ) : (
        results.map((user) => {
          const fullName = `${user.firstName} ${user.lastName}`.trim();
          const handle = user.username.includes("@")
            ? user.firstName || user.email.split("@")[0]
            : user.username;

          return (
            <Link
              key={user.keycloakId}
              to={`/profile/${user.keycloakId}`}
              onClick={onSelectResult}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors"
            >
              <div className="w-8 h-8 avatar-sharp shrink-0">
                <img
                  src={
                    user.avatarUrl ||
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
  );
}
