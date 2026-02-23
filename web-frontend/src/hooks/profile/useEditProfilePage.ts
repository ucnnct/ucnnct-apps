import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { mediaApi } from "../../api/media";
import { userApi, type UpdateProfileData, type UserProfile } from "../../api/users";
import { useAuth } from "../../auth/AuthProvider";

interface UseEditProfilePageResult {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  uploadingAvatar: boolean;
  avatarPreview: string | null;
  editData: UpdateProfileData;
  fileInputRef: RefObject<HTMLInputElement | null>;
  navigateToProfile: () => void;
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSave: () => Promise<void>;
  updateEditData: (next: UpdateProfileData) => void;
}

export function useEditProfilePage(): UseEditProfilePageResult {
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
    userApi
      .getMe()
      .then((user) => {
        setProfile(user);
        setEditData({
          bio: user.bio ?? "",
          university: user.university ?? "",
          location: user.location ?? "",
          website: user.website ?? "",
          fieldOfStudy: user.fieldOfStudy ?? "",
          avatarUrl: user.avatarUrl ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const response = await mediaApi.upload(file, "avatars");
      setEditData((previous) => ({ ...previous, avatarUrl: response.url }));
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

  const navigateToProfile = () => navigate("/profile");

  return {
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
    updateEditData: setEditData,
  };
}
