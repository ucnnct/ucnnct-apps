import type { GroupMemberSummary } from "../../api/groups";
import type { UserProfile } from "../../api/users";
import type { GroupMemberViewItem } from "../../components/messages";

function resolveProfileDisplayName(profile: UserProfile, fallbackUserId: string): string {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return fullName || profile.email || profile.username || fallbackUserId;
}

function resolveProfileHandle(profile: UserProfile): string {
  const username = profile.username ?? "";
  return username.includes("@") ? `@${profile.email.split("@")[0]}` : `@${username}`;
}

export function toMemberViewItems(
  members: GroupMemberSummary[],
  profilesById: Record<string, UserProfile>,
  presenceByUserId: Record<string, boolean>,
): GroupMemberViewItem[] {
  const items = members.map((member) => {
    const profile = profilesById[member.userId];
    return {
      userId: member.userId,
      role: member.role,
      displayName: profile
        ? resolveProfileDisplayName(profile, member.userId)
        : `Utilisateur ${member.userId.slice(0, 8)}`,
      handle: profile ? resolveProfileHandle(profile) : `@${member.userId.slice(0, 8)}`,
      avatarUrl: profile?.avatarUrl ?? null,
      online: Boolean(presenceByUserId[member.userId]),
    };
  });

  const rank: Record<GroupMemberSummary["role"], number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
  };

  return items.sort((left, right) => {
    const roleOrder = rank[left.role] - rank[right.role];
    if (roleOrder !== 0) {
      return roleOrder;
    }
    return left.displayName.localeCompare(right.displayName, "fr");
  });
}
