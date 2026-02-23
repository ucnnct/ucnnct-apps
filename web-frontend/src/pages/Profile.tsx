import {
  Award,
  Calendar,
  FileText,
  GraduationCap,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  MapPin,
} from "lucide-react";
import type { ReactNode } from "react";
import Layout from "../components/layout/Layout";
import FriendActionControls from "../components/profile/FriendActionControls";
import ProjectsTab from "../components/profile/ProjectsTab";
import { useProfilePage } from "../hooks/profile/useProfilePage";

export default function Profile() {
  const {
    id,
    activeTab,
    setActiveTab,
    profile,
    loading,
    error,
    friendStatus,
    actionLoading,
    projects,
    showProjectForm,
    editingProject,
    projectForm,
    uploadingProjectImage,
    projectImagePreview,
    isOwnProfile,
    friendCount,
    setProjectForm,
    setShowProjectForm,
    handleFriendAction,
    openProjectForm,
    handleProjectImageChange,
    handleProjectSubmit,
    handleProjectDelete,
  } = useProfilePage();

  if (loading) {
    return (
      <Layout hideSidebarRight>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout hideSidebarRight>
        <div className="flex flex-col items-center justify-center h-96 gap-2">
          <p className="text-xs font-normal text-secondary-300">Profil non trouve</p>
          {error && <p className="text-xs font-normal text-red-400">{error}</p>}
        </div>
      </Layout>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const handle = profile.username.includes("@")
    ? profile.firstName || profile.email.split("@")[0]
    : profile.username;
  const joinDate = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Layout hideSidebarRight>
      <div className="px-8 pt-8 flex flex-col bg-white min-h-screen font-body">
        <div className="h-28 bg-secondary-100 relative">
          <div className="absolute inset-0 bg-linear-to-br from-primary-500/20 to-secondary-200/50" />
        </div>

        <div className="px-8 pb-8 border-b border-secondary-100">
          <div className="relative -mt-10 mb-4">
            <div className="w-20 h-20 bg-white p-1 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
              <div className="w-full h-full bg-secondary-50 rounded-sm overflow-hidden border border-secondary-100">
                <img
                  src={
                    profile.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
                  }
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-primary-900 font-display">{fullName}</h1>
              <p className="text-sm font-normal text-secondary-400">@{handle}</p>
            </div>
            <div className="flex gap-3">
              <FriendActionControls
                isOwnProfile={isOwnProfile}
                friendStatus={friendStatus}
                actionLoading={actionLoading}
                profileId={id}
                onFriendAction={(action) => void handleFriendAction(action)}
              />
            </div>
          </div>

          <p className="text-sm text-primary-900 font-normal leading-relaxed max-w-2xl">
            {profile.bio || "Aucune bio pour le moment."}
          </p>

          <div className="mt-6 flex flex-wrap gap-y-2 gap-x-6">
            {profile.university && (
              <InfoItem icon={<GraduationCap size={16} />} text={profile.university} />
            )}
            {profile.location && <InfoItem icon={<MapPin size={16} />} text={profile.location} />}
            {profile.website && (
              <InfoItem icon={<LinkIcon size={16} />} text={profile.website} color="text-primary-500" />
            )}
            <InfoItem icon={<Calendar size={16} />} text={`Inscrit en ${joinDate}`} />
          </div>

          {isOwnProfile && (
            <div className="mt-6 flex gap-6">
              <div className="flex gap-1.5 items-baseline">
                <span className="font-bold text-primary-900 text-lg">{friendCount}</span>
                <span className="text-[11px] font-medium text-secondary-400 uppercase tracking-widest">
                  Amis
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex border-b border-secondary-100 bg-white sticky top-0 z-10">
          <ProfileTab
            active={activeTab === "posts"}
            onClick={() => setActiveTab("posts")}
            icon={<LayoutGrid size={16} />}
            label="POSTS"
          />
          <ProfileTab
            active={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
            icon={<FileText size={16} />}
            label="PROJETS"
          />
          <ProfileTab
            active={activeTab === "awards"}
            onClick={() => setActiveTab("awards")}
            icon={<Award size={16} />}
            label="BADGES"
          />
        </div>

        <div className="p-8 flex-1">
          {activeTab === "posts" && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
              <p className="text-xs font-normal text-secondary-300">Aucun post public</p>
            </div>
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              isOwnProfile={isOwnProfile}
              projects={projects}
              showProjectForm={showProjectForm}
              editingProject={editingProject}
              projectForm={projectForm}
              uploadingProjectImage={uploadingProjectImage}
              projectImagePreview={projectImagePreview}
              actionLoading={actionLoading}
              setProjectForm={(next) => setProjectForm(next)}
              setShowProjectForm={(open) => setShowProjectForm(open)}
              openProjectForm={openProjectForm}
              onProjectImageChange={handleProjectImageChange}
              onProjectSubmit={handleProjectSubmit}
              onProjectDelete={handleProjectDelete}
            />
          )}

          {activeTab === "awards" && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
              <p className="text-xs font-normal text-secondary-300">Aucun badge pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({
  icon,
  text,
  color = "text-secondary-500",
}: {
  icon: ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span className="text-sm font-normal">{text}</span>
    </div>
  );
}

interface ProfileTabProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function ProfileTab({ active, onClick, icon, label }: ProfileTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-medium tracking-wide uppercase transition-all relative ${active ? "text-primary-500" : "text-secondary-400 hover:text-secondary-600"}`}
    >
      {icon}
      <span>{label}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}
