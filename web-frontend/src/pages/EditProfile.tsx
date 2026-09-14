import { ArrowLeft, Camera, FileText, GraduationCap, Link as LinkIcon, Loader2, MapPin, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { feedApi, type ActivityDomain, type ActivitySuggestion } from "../api/feed";
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
  const [domains, setDomains] = useState<ActivityDomain[]>([]);
  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySuggestion[]>([]);

  useEffect(() => {
    feedApi.getActivityDomains().then(setDomains).catch(() => undefined);
  }, []);

  const selectedActivities = splitInput(editData.interests ?? "");
  const selectedDomains = splitInput(editData.preferredActivityCategories ?? "");

  const updateSelectedActivities = (items: string[]) => {
    updateEditData({ ...editData, interests: items.join(",") });
  };

  const updateSelectedDomains = (items: string[]) => {
    updateEditData({ ...editData, preferredActivityCategories: items.join(",") });
  };

  const searchActivities = (query: string) => {
    if (query.trim().length < 2) {
      setActivitySuggestions([]);
      return;
    }
    feedApi
      .searchActivitySuggestions(query, 8)
      .then(setActivitySuggestions)
      .catch(() => setActivitySuggestions([]));
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
                <EditField
                  label="Ecole"
                  value={editData.school ?? ""}
                  onChange={(value) => updateEditData({ ...editData, school: value })}
                  placeholder="Ex: SIRIUS"
                />
                <EditField
                  label="Campus"
                  value={editData.campus ?? ""}
                  onChange={(value) => updateEditData({ ...editData, campus: value })}
                  placeholder="Ex: Paris"
                />
              </div>
            </Section>

            <Section icon={<GraduationCap size={16} />} title="Preferences">
              <ChipSelector
                label="Activites qui t'interessent"
                items={selectedActivities}
                maxItems={10}
                placeholder="Rechercher une activite"
                suggestions={activitySuggestions.map((item) => item.title)}
                onSearch={searchActivities}
                onChange={updateSelectedActivities}
              />
              <ChipSelector
                label="Domaines preferes"
                items={selectedDomains}
                maxItems={5}
                placeholder="Choisir un domaine"
                suggestions={domains.map((domain) => domain.name)}
                onChange={updateSelectedDomains}
              />
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
    <div className="bg-white border border-secondary-100 rounded-sm overflow-visible">
      <div className="px-6 py-4 border-b border-secondary-100 flex items-center gap-3">
        <span className="text-secondary-400">{icon}</span>
        <h2 className="text-[11px] font-medium text-primary-900 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4 relative">{children}</div>
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

function ChipSelector({
  label,
  items,
  maxItems,
  placeholder,
  suggestions,
  onSearch,
  onChange,
}: {
  label: string;
  items: string[];
  maxItems: number;
  placeholder: string;
  suggestions: string[];
  onSearch?: (query: string) => void;
  onChange: (items: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const remainingSuggestions = suggestions.filter(
    (suggestion) => !items.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );

  const addItem = (value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue || items.length >= maxItems) {
      return;
    }
    if (items.some((item) => item.toLowerCase() === cleanValue.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...items, cleanValue]);
    setQuery("");
  };

  const removeItem = (value: string) => {
    onChange(items.filter((item) => item !== value));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="text-[11px] font-medium text-secondary-400 block">{label}</label>
        <span className="text-[11px] text-secondary-300">
          {items.length}/{maxItems}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => removeItem(item)}
            className="bg-primary-50 text-primary-700 border border-primary-100 rounded-sm px-2 py-1 text-xs"
          >
            {item} x
          </button>
        ))}
      </div>
      <div className="relative z-20">
        <input
          value={query}
          disabled={items.length >= maxItems}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearch?.(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem(query);
            }
          }}
          placeholder={items.length >= maxItems ? "Maximum atteint" : placeholder}
          className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2.5 px-3 text-sm text-primary-900 transition-all placeholder:text-secondary-300 placeholder:text-xs disabled:opacity-60"
        />
        {remainingSuggestions.length > 0 && items.length < maxItems && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-secondary-100 rounded-sm shadow-lg z-50 max-h-56 overflow-y-auto">
            {remainingSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addItem(suggestion)}
                className="w-full text-left px-3 py-2 text-xs text-primary-900 hover:bg-secondary-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function splitInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
