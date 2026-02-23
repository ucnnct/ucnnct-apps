import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useParams } from "react-router-dom";
import { mediaApi } from "../../api/media";
import { projectApi, type Project, type ProjectRequest } from "../../api/projects";
import { userApi, type UserProfile } from "../../api/users";
import { useAuth } from "../../auth/AuthProvider";
import { useNetworkStore } from "../../stores/networkStore";

export type FriendStatus = "none" | "friends" | "pending_sent" | "pending_received";

interface UseProfilePageResult {
  id: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  friendStatus: FriendStatus;
  actionLoading: boolean;
  projects: Project[];
  showProjectForm: boolean;
  editingProject: Project | null;
  projectForm: ProjectRequest;
  uploadingProjectImage: boolean;
  projectImagePreview: string | null;
  isOwnProfile: boolean;
  friendCount: number;
  setProjectForm: Dispatch<SetStateAction<ProjectRequest>>;
  setShowProjectForm: Dispatch<SetStateAction<boolean>>;
  handleFriendAction: (action: "add" | "accept" | "remove") => Promise<void>;
  openProjectForm: (project?: Project) => void;
  handleProjectImageChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleProjectSubmit: () => Promise<void>;
  handleProjectDelete: (projectId: number) => Promise<void>;
}

export function useProfilePage(): UseProfilePageResult {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ?? null;
  const [activeTab, setActiveTab] = useState("posts");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [actionLoading, setActionLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectRequest>({
    title: "",
    description: "",
    tags: "",
  });
  const [uploadingProjectImage, setUploadingProjectImage] = useState(false);
  const [projectImagePreview, setProjectImagePreview] = useState<string | null>(null);

  const { user: authUser } = useAuth();
  const friends = useNetworkStore((state) => state.friends);
  const sentRequests = useNetworkStore((state) => state.sent);
  const receivedRequests = useNetworkStore((state) => state.received);
  const loadNetwork = useNetworkStore((state) => state.load);
  const sendFriendRequest = useNetworkStore((state) => state.sendRequest);
  const acceptFriendRequest = useNetworkStore((state) => state.acceptRequest);
  const removeFriend = useNetworkStore((state) => state.removeFriend);

  const isOwnProfile = !id || id === authUser?.sub;
  const friendCount = friends.length;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadProfile = isOwnProfile
      ? userApi.getMe().then((user) => {
          setProfile(user);
          return projectApi.getMine().then(setProjects).catch(() => undefined);
        })
      : userApi.getById(id as string).then((user) => {
          setProfile(user);
          return projectApi.getByUser(id as string).then(setProjects).catch(() => undefined);
        });

    loadProfile
      .catch((loadError: Error) => {
        console.error("Profile load error:", loadError);
        setError(loadError.message);
      })
      .finally(() => setLoading(false));
  }, [id, isOwnProfile]);

  useEffect(() => {
    if (!authUser?.sub) {
      return;
    }
    void loadNetwork(authUser.sub);
  }, [authUser?.sub, loadNetwork]);

  useEffect(() => {
    if (isOwnProfile || !id || !authUser?.sub) {
      return;
    }

    if (friends.some((friend) => friend.keycloakId === id)) {
      setFriendStatus("friends");
      return;
    }

    if (sentRequests.some((request) => request.receiver.keycloakId === id)) {
      setFriendStatus("pending_sent");
      return;
    }

    if (receivedRequests.some((request) => request.requester.keycloakId === id)) {
      setFriendStatus("pending_received");
      return;
    }

    setFriendStatus("none");
  }, [authUser?.sub, friends, id, isOwnProfile, receivedRequests, sentRequests]);

  const handleFriendAction = async (action: "add" | "accept" | "remove") => {
    if (!id || !authUser?.sub) {
      return;
    }
    setActionLoading(true);
    try {
      if (action === "add") {
        await sendFriendRequest(id);
      } else if (action === "accept") {
        await acceptFriendRequest(id, authUser.sub);
      } else {
        await removeFriend(id, authUser.sub);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const openProjectForm = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        title: project.title,
        description: project.description,
        tags: project.tags,
        imageUrl: project.imageUrl ?? undefined,
        link: project.link ?? undefined,
      });
      setProjectImagePreview(project.imageUrl ?? null);
    } else {
      setEditingProject(null);
      setProjectForm({ title: "", description: "", tags: "" });
      setProjectImagePreview(null);
    }
    setShowProjectForm(true);
  };

  const handleProjectImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setProjectImagePreview(URL.createObjectURL(file));
    setUploadingProjectImage(true);
    try {
      const response = await mediaApi.upload(file, "projects");
      setProjectForm((previous) => ({ ...previous, imageUrl: response.url }));
    } catch {
      setProjectImagePreview(null);
    } finally {
      setUploadingProjectImage(false);
    }
  };

  const handleProjectSubmit = async () => {
    if (!projectForm.title.trim()) {
      return;
    }
    setActionLoading(true);
    try {
      if (editingProject) {
        const updated = await projectApi.update(editingProject.id, projectForm);
        setProjects((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await projectApi.create(projectForm);
        setProjects((previous) => [created, ...previous]);
      }
      setShowProjectForm(false);
      setEditingProject(null);
      setProjectForm({ title: "", description: "", tags: "" });
      setProjectImagePreview(null);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleProjectDelete = async (projectId: number) => {
    setActionLoading(true);
    try {
      await projectApi.delete(projectId);
      setProjects((previous) => previous.filter((project) => project.id !== projectId));
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  return {
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
  };
}
