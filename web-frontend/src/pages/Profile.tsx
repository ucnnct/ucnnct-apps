import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  Calendar,
  Camera,
  MapPin,
  Link as LinkIcon,
  GraduationCap,
  Settings,
  LayoutGrid,
  FileText,
  Award,
  ExternalLink,
  Plus,
  UserPlus,
  UserMinus,
  Check,
  Loader2,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import { userApi, type UserProfile } from "../api/users";
import { friendApi } from "../api/friends";
import { projectApi, type Project, type ProjectRequest } from "../api/projects";
import { mediaApi } from "../api/media";

type FriendStatus = "none" | "friends" | "pending_sent" | "pending_received";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [actionLoading, setActionLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectRequest>({ title: "", description: "", tags: "" });
  const [uploadingProjectImage, setUploadingProjectImage] = useState(false);
  const [projectImagePreview, setProjectImagePreview] = useState<string | null>(null);
  const { token, user: authUser } = useAuth();

  const isOwnProfile = !id || id === authUser?.sub;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    if (isOwnProfile) {
      userApi.getMe(token).then((user) => {
        setProfile(user);
        return Promise.all([
          friendApi.getCount(token).then((c) => setFriendCount(c.count)).catch(() => {}),
          projectApi.getMine(token).then(setProjects).catch(() => {}),
        ]);
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
          projectApi.getByUser(token, id!).then(setProjects).catch(() => {}),
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

  const openProjectForm = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({ title: project.title, description: project.description, tags: project.tags, imageUrl: project.imageUrl ?? undefined, link: project.link ?? undefined });
      setProjectImagePreview(project.imageUrl ?? null);
    } else {
      setEditingProject(null);
      setProjectForm({ title: "", description: "", tags: "" });
      setProjectImagePreview(null);
    }
    setShowProjectForm(true);
  };

  const handleProjectImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setProjectImagePreview(URL.createObjectURL(file));
    setUploadingProjectImage(true);
    try {
      const res = await mediaApi.upload(token, file, "projects");
      setProjectForm((prev) => ({ ...prev, imageUrl: res.url }));
    } catch {
      setProjectImagePreview(null);
    } finally {
      setUploadingProjectImage(false);
    }
  };

  const handleProjectSubmit = async () => {
    if (!token || !projectForm.title.trim()) return;
    setActionLoading(true);
    try {
      if (editingProject) {
        const updated = await projectApi.update(token, editingProject.id, projectForm);
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await projectApi.create(token, projectForm);
        setProjects((prev) => [created, ...prev]);
      }
      setShowProjectForm(false);
      setEditingProject(null);
      setProjectForm({ title: "", description: "", tags: "" });
      setProjectImagePreview(null);
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleProjectDelete = async (projectId: number) => {
    if (!token) return;
    setActionLoading(true);
    try {
      await projectApi.delete(token, projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
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
          <div className="relative -mt-10 mb-4">
            <div className="w-20 h-20 bg-white p-1 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
              <div className="w-full h-full bg-secondary-50 rounded-sm overflow-hidden border border-secondary-100">
                <img
                  src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h1 className="text-lg font-black text-primary-900 uppercase tracking-tight font-display">
                {fullName}
              </h1>
              <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                @{handle.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-3">
              {isOwnProfile ? (
                <Link
                  to="/profile/edit"
                  className="flex items-center gap-2 px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-primary-900 font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95"
                >
                  <Settings size={14} />
                  MODIFIER LE PROFIL
                </Link>
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

          <p className="text-primary-900 font-medium leading-relaxed max-w-2xl">
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

          {isOwnProfile && (
            <div className="mt-6 flex gap-6">
              <div className="flex gap-1.5 items-baseline">
                <span className="font-black text-primary-900 text-lg">{friendCount}</span>
                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
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
              <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                Aucun post public
              </p>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <SectionHeader label={isOwnProfile ? "Mes réalisations" : "Réalisations"} />
                {isOwnProfile && (
                  <button
                    onClick={() => openProjectForm()}
                    className="flex items-center gap-2 text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-700 transition-colors"
                  >
                    <Plus size={14} strokeWidth={3} />
                    AJOUTER
                  </button>
                )}
              </div>

              {showProjectForm && (
                <div className="border border-secondary-100 rounded-sm p-6 space-y-4 bg-secondary-50/30">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-primary-900 uppercase tracking-widest">
                      {editingProject ? "MODIFIER LE PROJET" : "NOUVEAU PROJET"}
                    </h3>
                    <button onClick={() => setShowProjectForm(false)} className="text-secondary-400 hover:text-secondary-600">
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Titre du projet"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  <textarea
                    placeholder="Description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Tags (séparés par des virgules)"
                    value={projectForm.tags}
                    onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  <input
                    type="url"
                    placeholder="Lien du projet (optionnel)"
                    value={projectForm.link || ""}
                    onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium hover:border-primary-500 transition-colors cursor-pointer">
                      {uploadingProjectImage ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Camera size={14} />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {projectImagePreview ? "Changer l'image" : "Ajouter une image"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProjectImageChange}
                      />
                    </label>
                    {projectImagePreview && (
                      <div className="mt-2 w-32 h-20 rounded-sm overflow-hidden border border-secondary-100">
                        <img src={projectImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowProjectForm(false)}
                      className="px-6 py-2 border border-secondary-200 text-primary-900 font-black text-[10px] uppercase tracking-widest rounded-sm hover:bg-secondary-50 transition-colors"
                    >
                      ANNULER
                    </button>
                    <button
                      onClick={handleProjectSubmit}
                      disabled={actionLoading || !projectForm.title.trim()}
                      className="px-6 py-2 bg-primary-500 text-white font-black text-[10px] uppercase tracking-widest rounded-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : editingProject ? "ENREGISTRER" : "CRÉER"}
                    </button>
                  </div>
                </div>
              )}

              {projects.length === 0 && !showProjectForm ? (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
                  <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                    Aucun projet pour le moment
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {projects.map((project) => (
                    <div key={project.id} className="group">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="aspect-video bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden flex items-center justify-center">
                          {project.imageUrl ? (
                            <img
                              src={project.imageUrl}
                              alt={project.title}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                          ) : (
                            <FileText size={32} className="text-secondary-200" />
                          )}
                        </div>
                        <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                          <div className="flex gap-2">
                            {project.tags.split(",").filter(Boolean).map((tag) => (
                              <span
                                key={tag.trim()}
                                className="text-[8px] font-black text-primary-500 uppercase tracking-wider"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-primary-900 uppercase tracking-tight group-hover:text-primary-500 transition-colors flex items-center gap-2">
                              {project.title}
                              {project.link && (
                                <a href={project.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </h3>
                            {isOwnProfile && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openProjectForm(project)} className="text-secondary-400 hover:text-primary-500">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleProjectDelete(project.id)} className="text-secondary-400 hover:text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-secondary-500 text-sm leading-relaxed">
                            {project.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
