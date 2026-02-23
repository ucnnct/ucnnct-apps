import { ArrowLeft, Camera, FileText, GraduationCap, Link as LinkIcon, Loader2, MapPin, User } from "lucide-react";
import type { ReactNode } from "react";
import Layout from "../components/layout/Layout";
import { useEditProfilePage } from "../hooks/profile/useEditProfilePage";

export default function EditProfile() {
  const {
    profile,
    loading,
    saving,
    uploadingAvatar,
    avatarPreview,
    editData,
    fileInputRef,
    navigateToProfile,
    handleAvatarChange,
    handleSave,
    updateEditData,
  } = useEditProfilePage();

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
    return null;
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const handle = profile.username.includes("@")
    ? profile.firstName || profile.email.split("@")[0]
    : profile.username;

  return (
    <Layout hideSidebarRight>
      <div className="flex flex-col h-full bg-secondary-50/30 font-body">
        <div className="px-8 py-5 border-b border-secondary-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={navigateToProfile}
              className="p-2 hover:bg-secondary-50 rounded-sm transition-colors text-secondary-500 hover:text-primary-900"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-primary-900 font-display">Modifier le profil</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={navigateToProfile}
              className="px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-secondary-500 font-medium text-xs uppercase tracking-wide rounded-sm transition-all"
            >
              ANNULER
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              ENREGISTRER
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Section icon={<User size={16} />} title="Identite">
              <div className="flex items-center gap-5 mb-5 pb-5 border-b border-secondary-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 bg-white p-0.5 rounded-sm border border-secondary-100 shadow-sm overflow-hidden shrink-0 group cursor-pointer"
                >
                  <img
                    src={
                      avatarPreview ||
                      editData.avatarUrl ||
                      profile.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
                    }
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
                    onChange={(event) => void handleAvatarChange(event)}
                  />
                </button>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary-900">{fullName}</p>
                  <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
                  <p className="text-[11px] font-normal text-secondary-300">{profile.email}</p>
                </div>
              </div>
              <ReadOnlyField label="Nom complet" value={fullName} />
              <ReadOnlyField label="Email" value={profile.email} />
              <p className="text-[11px] font-normal text-secondary-300 mt-3">
                Ces informations sont gerees par Keycloak
              </p>
            </Section>

            <Section icon={<FileText size={16} />} title="A propos">
              <EditField
                label="Bio"
                value={editData.bio ?? ""}
                onChange={(value) => updateEditData({ ...editData, bio: value })}
                multiline
                placeholder="Decris-toi en quelques mots..."
              />
            </Section>

            <Section icon={<GraduationCap size={16} />} title="Etudes">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField
                  label="Universite"
                  value={editData.university ?? ""}
                  onChange={(value) => updateEditData({ ...editData, university: value })}
                  placeholder="Ex: Universite de Paris"
                />
                <EditField
                  label="Filiere"
                  value={editData.fieldOfStudy ?? ""}
                  onChange={(value) => updateEditData({ ...editData, fieldOfStudy: value })}
                  placeholder="Ex: Informatique L3"
                />
              </div>
            </Section>

            <Section icon={<MapPin size={16} />} title="Localisation & liens">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField
                  label="Localisation"
                  value={editData.location ?? ""}
                  onChange={(value) => updateEditData({ ...editData, location: value })}
                  placeholder="Ex: Paris, France"
                  icon={<MapPin size={14} className="text-secondary-300" />}
                />
                <EditField
                  label="Site web"
                  value={editData.website ?? ""}
                  onChange={(value) => updateEditData({ ...editData, website: value })}
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
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-secondary-100 rounded-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-100 flex items-center gap-3">
        <span className="text-secondary-400">{icon}</span>
        <h2 className="text-[11px] font-medium text-primary-900 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-secondary-400 mb-1.5 block">{label}</label>
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
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  icon?: ReactNode;
}) {
  const className =
    "w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2.5 text-sm text-primary-900 transition-all placeholder:text-secondary-300 placeholder:text-xs";
  return (
    <div>
      <label className="text-[11px] font-medium text-secondary-400 mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={`${className} px-3`}
          placeholder={placeholder}
        />
      ) : (
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${className} ${icon ? "pl-9" : "px-3"} pr-3`}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}
