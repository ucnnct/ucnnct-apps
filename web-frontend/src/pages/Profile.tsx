import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  GraduationCap,
  MoreHorizontal,
  LayoutGrid,
  FileText,
  Award,
  ExternalLink,
  Plus,
  UserPlus,
  UserMinus,
  Check,
  Loader2,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import { userApi, type UserProfile, type UpdateProfileData } from "../api/users";
import { friendApi } from "../api/friends";

const PROJECTS = [
  {
    id: 1,
    title: "U-Connect Design System",
    description:
      "Conception d'un système de design complet basé sur les principes du Swiss Design.",
    tags: ["REACT", "TAILWIND"],
    image:
      "https://images.unsplash.com/photo-1581291518062-c12427a9740a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "EcoTrack Mobile App",
    description:
      "Application mobile permettant aux étudiants de suivre leur empreinte carbone.",
    tags: ["FLUTTER", "FIREBASE"],
    image:
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80",
  },
];

type FriendStatus = "none" | "friends" | "pending_sent" | "pending_received";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateProfileData>({});
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [actionLoading, setActionLoading] = useState(false);
  const { token, user: authUser } = useAuth();

  const isOwnProfile = !id || id === authUser?.sub;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setEditing(false);
    setError(null);

    if (isOwnProfile) {
      userApi.getMe(token).then((user) => {
        setProfile(user);
        setEditData({
          bio: user.bio ?? "",
          university: user.university ?? "",
          location: user.location ?? "",
          website: user.website ?? "",
          fieldOfStudy: user.fieldOfStudy ?? "",
        });
        return friendApi.getCount(token).then((c) => setFriendCount(c.count)).catch(() => {});
      }).catch((err) => {
        console.error("Profile load error:", err);
        setError(err.message);
      }).finally(() => setLoading(false));
    } else {
      userApi.getById(token, id!).then((user) => {
        setProfile(user);
        return Promise.all([
          friendApi.getMyFriends(token),
          friendApi.getSentRequests(token),
          friendApi.getPendingRequests(token),
        ]).then(([friends, sent, pending]) => {
          if (friends.some((f) => f.keycloakId === id)) {
            setFriendStatus("friends");
          } else if (sent.some((s) => s.receiver.keycloakId === id)) {
            setFriendStatus("pending_sent");
          } else if (pending.some((p) => p.requester.keycloakId === id)) {
            setFriendStatus("pending_received");
          } else {
            setFriendStatus("none");
          }
        }).catch(() => {});
      }).catch((err) => {
        console.error("Profile load error:", err);
        setError(err.message);
      }).finally(() => setLoading(false));
    }
  }, [token, id]);

  const handleSave = async () => {
    if (!token) return;
    const updated = await userApi.updateMe(token, editData);
    setProfile(updated);
    setEditing(false);
  };

  const handleFriendAction = async (action: "add" | "accept" | "remove") => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      if (action === "add") {
        await friendApi.sendRequest(token, id);
        setFriendStatus("pending_sent");
      } else if (action === "accept") {
        await friendApi.accept(token, id);
        setFriendStatus("friends");
      } else {
        await friendApi.remove(token, id);
        setFriendStatus("none");
      }
    } catch { /* ignore */ }
    setActionLoading(false);
  };

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
          <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
            Profil non trouvé
          </p>
          {error && (
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
              {error}
            </p>
          )}
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
    <Layout hideSidebarRight={true}>
      <div className="px-8 pt-8 flex flex-col bg-white min-h-screen font-body">
        <div className="h-28 bg-secondary-100 relative">
          <div className="absolute inset-0 bg-linear-to-br from-primary-500/20 to-secondary-200/50"></div>
        </div>

        <div className="px-8 pb-8 border-b border-secondary-100">
          <div className="relative flex justify-between items-end -mt-10 mb-6">
            <div className="w-20 h-20 bg-white p-1 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
              <div className="w-full h-full bg-secondary-50 rounded-sm overflow-hidden border border-secondary-100">
                <img
                  src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-primary-900 font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95"
                  >
                    {editing ? "ANNULER" : "MODIFIER LE PROFIL"}
                  </button>
                  <button className="p-2 border border-secondary-200 rounded-sm hover:bg-secondary-50 transition-all text-secondary-600">
                    <MoreHorizontal size={20} />
                  </button>
                </>
              ) : (
                <>
                  {friendStatus === "none" && (
                    <button
                      onClick={() => handleFriendAction("add")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UserPlus size={14} strokeWidth={3} />
                      AJOUTER EN AMI
                    </button>
                  )}
                  {friendStatus === "pending_sent" && (
                    <span className="flex items-center gap-2 px-6 py-2 border border-secondary-200 text-secondary-400 font-black text-[10px] uppercase tracking-widest rounded-sm">
                      <Check size={14} strokeWidth={3} />
                      DEMANDE ENVOYÉE
                    </span>
                  )}
                  {friendStatus === "pending_received" && (
                    <button
                      onClick={() => handleFriendAction("accept")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Check size={14} strokeWidth={3} />
                      ACCEPTER LA DEMANDE
                    </button>
                  )}
                  {friendStatus === "friends" && (
                    <button
                      onClick={() => handleFriendAction("remove")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-6 py-2 border border-red-200 text-red-500 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UserMinus size={14} strokeWidth={3} />
                      RETIRER DES AMIS
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-lg font-black text-primary-900 uppercase tracking-tight font-display">
              {fullName}
            </h1>
            <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
              @{handle.toUpperCase()}
            </p>
          </div>

          {editing && isOwnProfile ? (
            <div className="mt-4 space-y-3 max-w-2xl">
              <EditField label="Bio" value={editData.bio ?? ""} onChange={(v) => setEditData({ ...editData, bio: v })} multiline />
              <EditField label="Université" value={editData.university ?? ""} onChange={(v) => setEditData({ ...editData, university: v })} />
              <EditField label="Localisation" value={editData.location ?? ""} onChange={(v) => setEditData({ ...editData, location: v })} />
              <EditField label="Site web" value={editData.website ?? ""} onChange={(v) => setEditData({ ...editData, website: v })} />
              <EditField label="Filière" value={editData.fieldOfStudy ?? ""} onChange={(v) => setEditData({ ...editData, fieldOfStudy: v })} />
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest rounded-sm transition-all"
              >
                ENREGISTRER
              </button>
            </div>
          ) : (
            <>
              <p className="mt-4 text-primary-900 font-medium leading-relaxed max-w-2xl">
                {profile.bio || "Aucune bio pour le moment."}
              </p>

              <div className="mt-6 flex flex-wrap gap-y-2 gap-x-6">
                {profile.university && (
                  <InfoItem icon={<GraduationCap size={16} />} text={profile.university} />
                )}
                {profile.location && (
                  <InfoItem icon={<MapPin size={16} />} text={profile.location} />
                )}
                {profile.website && (
                  <InfoItem icon={<LinkIcon size={16} />} text={profile.website} color="text-primary-500" />
                )}
                <InfoItem icon={<Calendar size={16} />} text={`Inscrit en ${joinDate}`} />
              </div>
            </>
          )}

          <div className="mt-6 flex gap-6">
            <div className="flex gap-1.5 items-baseline">
              <span className="font-black text-primary-900 text-lg">{friendCount}</span>
              <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                Amis
              </span>
            </div>
          </div>
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
              <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                Aucun post public
              </p>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <SectionHeader label="Mes réalisations" />
                <button className="flex items-center gap-2 text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-700 transition-colors">
                  <Plus size={14} strokeWidth={3} />
                  AJOUTER
                </button>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {PROJECTS.map((project) => (
                  <div key={project.id} className="group cursor-pointer">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="aspect-video bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                      <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                        <div className="flex gap-2">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[8px] font-black text-primary-500 tracking-tighter"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-lg font-black text-primary-900 uppercase tracking-tight group-hover:text-primary-500 transition-colors flex items-center gap-2">
                          {project.title}
                          <ExternalLink size={14} />
                        </h3>
                        <p className="text-secondary-500 text-sm leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "awards" && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
              <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                Aucun badge pour le moment
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls = "w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2 px-3 text-sm text-primary-900 transition-all";
  return (
    <div>
      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

function InfoItem({
  icon,
  text,
  color = "text-secondary-500",
}: {
  icon: React.ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-tight">
        {text}
      </span>
    </div>
  );
}

function ProfileTab({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black tracking-[0.2em] transition-all relative ${active ? "text-primary-500" : "text-secondary-400 hover:text-secondary-600"}`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </button>
  );
}
