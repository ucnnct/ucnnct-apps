import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User,
  GraduationCap,
  MapPin,
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import { userApi, type UserProfile, type UpdateProfileData } from "../api/users";
import { mediaApi } from "../api/media";
import { useAuth } from "../auth/AuthProvider";

export default function EditProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateProfileData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userApi.getMe().then((user) => {
      setProfile(user);
      setEditData({
        bio: user.bio ?? "",
        university: user.university ?? "",
        location: user.location ?? "",
        website: user.website ?? "",
        fieldOfStudy: user.fieldOfStudy ?? "",
        avatarUrl: user.avatarUrl ?? "",
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const res = await mediaApi.upload(file, "avatars");
      setEditData((prev) => ({ ...prev, avatarUrl: res.url }));
    } catch {
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await userApi.updateMe(editData);
    updateUser({ avatarUrl: editData.avatarUrl ?? null });
    setSaving(false);
    navigate("/profile");
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

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const handle = profile.username.includes("@")
    ? profile.firstName || profile.email.split("@")[0]
    : profile.username;

  return (
    <Layout hideSidebarRight>
      <div className="flex flex-col h-full bg-secondary-50/30 font-body">
        {/* Header */}
        <div className="px-8 py-5 border-b border-secondary-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/profile")}
              className="p-2 hover:bg-secondary-50 rounded-sm transition-colors text-secondary-500 hover:text-primary-900"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-primary-900 font-display">
              Modifier le profil
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-secondary-500 font-medium text-xs uppercase tracking-wide rounded-sm transition-all"
            >
              ANNULER
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              ENREGISTRER
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Card: Identité */}
            <Section icon={<User size={16} />} title="Identité">
              <div className="flex items-center gap-5 mb-5 pb-5 border-b border-secondary-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 bg-white p-0.5 rounded-sm border border-secondary-100 shadow-sm overflow-hidden shrink-0 group cursor-pointer"
                >
                  <img
                    src={avatarPreview || editData.avatarUrl || profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 size={16} className="text-white animate-spin" />
                    ) : (
                      <Camera size={16} className="text-white" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </button>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary-900">
                    {fullName}
                  </p>
                  <p className="text-[11px] font-normal text-secondary-400">
                    @{handle}
                  </p>
                  <p className="text-[11px] font-normal text-secondary-300">
                    {profile.email}
                  </p>
                </div>
              </div>
              <ReadOnlyField label="Nom complet" value={fullName} />
              <ReadOnlyField label="Email" value={profile.email} />
              <p className="text-[11px] font-normal text-secondary-300 mt-3">
                Ces informations sont gérées par Keycloak
              </p>
            </Section>

            {/* Card: À propos */}
            <Section icon={<FileText size={16} />} title="À propos">
              <EditField
                label="Bio"
                value={editData.bio ?? ""}
                onChange={(v) => setEditData({ ...editData, bio: v })}
                multiline
                placeholder="Décris-toi en quelques mots..."
              />
            </Section>

            {/* Card: Études */}
            <Section icon={<GraduationCap size={16} />} title="Études">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField
                  label="Université"
                  value={editData.university ?? ""}
                  onChange={(v) => setEditData({ ...editData, university: v })}
                  placeholder="Ex: Université de Paris"
                />
                <EditField
                  label="Filière"
                  value={editData.fieldOfStudy ?? ""}
                  onChange={(v) => setEditData({ ...editData, fieldOfStudy: v })}
                  placeholder="Ex: Informatique L3"
                />
              </div>
            </Section>

            {/* Card: Localisation & liens */}
            <Section icon={<MapPin size={16} />} title="Localisation & liens">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField
                  label="Localisation"
                  value={editData.location ?? ""}
                  onChange={(v) => setEditData({ ...editData, location: v })}
                  placeholder="Ex: Paris, France"
                  icon={<MapPin size={14} className="text-secondary-300" />}
                />
                <EditField
                  label="Site web"
                  value={editData.website ?? ""}
                  onChange={(v) => setEditData({ ...editData, website: v })}
                  placeholder="Ex: https://monsite.fr"
                  icon={<LinkIcon size={14} className="text-secondary-300" />}
                />
              </div>
            </Section>

          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-secondary-100 rounded-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-100 flex items-center gap-3">
        <span className="text-secondary-400">{icon}</span>
        <h2 className="text-[11px] font-medium text-primary-900 uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-secondary-400 mb-1.5 block">
        {label}
      </label>
      <div className="w-full bg-secondary-50 border border-secondary-100 rounded-sm py-2.5 px-3 text-sm font-normal text-secondary-400">
        {value}
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const cls =
    "w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2.5 text-sm text-primary-900 transition-all placeholder:text-secondary-300 placeholder:text-xs";
  return (
    <div>
      <label className="text-[11px] font-medium text-secondary-400 mb-1.5 block">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${cls} px-3`}
          placeholder={placeholder}
        />
      ) : (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {icon}
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${cls} ${icon ? "pl-9" : "px-3"} pr-3`}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}
