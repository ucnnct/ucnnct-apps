import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import {
  feedApi,
  type ActivityDomain,
  type ActivitySuggestion,
  type CommentResponse,
  type FeedItem,
  type PostResponse,
  type PostType,
} from "../../api/feed";
import { mediaApi } from "../../api/media";
import { useAuth } from "../../auth/AuthProvider";
import { useFeedStore, type FeedTab } from "../../stores/feedStore";

const FEED_TABS: Array<{ id: FeedTab; label: string }> = [
  { id: "recommended", label: "RECOMMANDE" },
  { id: "activities", label: "ACTIVITES" },
  { id: "circles", label: "CERCLES" },
  { id: "friends", label: "AMIS" },
];

export default function Feed() {
  const activeTab = useFeedStore((state) => state.activeTab);
  const setActiveTab = useFeedStore((state) => state.setActiveTab);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await feedApi.getFeed(activeTab, 30);
      setItems(response.items);
    } catch {
      setError("Impossible de charger le fil.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const replacePost = (nextPost: PostResponse) => {
    setItems((previous) =>
      previous.map((item) => (item.post.id === nextPost.id ? { ...item, post: nextPost } : item)),
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-secondary-100 flex overflow-x-auto">
        {FEED_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            label={tab.label}
          />
        ))}
      </div>

      <CreatePostArea onCreated={() => void loadFeed()} />

      {error && (
        <div className="mx-6 mt-4 border border-red-100 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-secondary-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-secondary-100">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-secondary-400">
              Aucun contenu pour ce filtre.
            </div>
          ) : (
            items.map((item) => (
              <Post key={item.post.id} item={item} onPostChanged={replacePost} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-[130px] flex-1 py-4 text-xs font-medium tracking-wide uppercase transition-all relative ${active ? "text-primary-500" : "text-secondary-400 hover:text-secondary-600"}`}
    >
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}

function CreatePostArea({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState<PostType>("TEXT");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDomain, setActivityDomain] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityStartAt, setActivityStartAt] = useState("");
  const [activityCapacity, setActivityCapacity] = useState("");
  const [domains, setDomains] = useState<ActivityDomain[]>([]);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    feedApi
      .getActivityDomains()
      .then((items) => {
        setDomains(items);
        setActivityDomain((current) => current || items[0]?.name || "");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (type !== "ACTIVITY" || activityTitle.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      feedApi
        .searchActivitySuggestions(activityTitle, 6)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [activityTitle, type]);

  const canSubmit = useMemo(() => {
    if (type === "ACTIVITY") {
      return activityTitle.trim().length > 0 && activityDomain.trim().length > 0;
    }
    return content.trim().length > 0 || mediaUrl.trim().length > 0;
  }, [activityDomain, activityTitle, content, mediaUrl, type]);

  const reset = () => {
    setContent("");
    setTags("");
    setMediaUrl("");
    setActivityTitle("");
    setActivityDomain(domains[0]?.name || "");
    setActivityLocation("");
    setActivityStartAt("");
    setActivityCapacity("");
    setSuggestions([]);
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingMedia(true);
    setError(null);
    try {
      const response = await mediaApi.upload(file, "posts");
      setMediaUrl(response.url);
    } catch {
      setError("Image impossible a charger pour le moment.");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const selectSuggestion = (suggestion: ActivitySuggestion) => {
    setActivityTitle(suggestion.title);
    setActivityDomain(suggestion.domain);
    setSuggestions([]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await feedApi.createPost({
        type,
        visibility: "PUBLIC",
        content: content.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        tags: splitInput(tags),
        activity:
          type === "ACTIVITY"
            ? {
                title: activityTitle.trim(),
                category: activityDomain.trim(),
                domain: activityDomain.trim(),
                location: activityLocation.trim() || undefined,
                startAt: activityStartAt ? new Date(activityStartAt).toISOString() : undefined,
                capacity: activityCapacity ? Number(activityCapacity) : undefined,
              }
            : undefined,
      });
      reset();
      onCreated();
    } catch {
      setError("Publication impossible pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="p-6 border-b border-secondary-100">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden flex-shrink-0">
          <img
            src={
              user?.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName ?? "User")}`
            }
            alt="Me"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <ModeButton active={type === "TEXT"} onClick={() => setType("TEXT")} icon={<MessageCircle size={14} />} label="Post" />
            <ModeButton active={type === "ACTIVITY"} onClick={() => setType("ACTIVITY")} icon={<CalendarDays size={14} />} label="Activite" />
          </div>

          {type === "ACTIVITY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <input
                  value={activityTitle}
                  onChange={(event) => setActivityTitle(event.target.value)}
                  placeholder="Titre de l'activite"
                  className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900 placeholder:text-secondary-300"
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-secondary-100 rounded-sm shadow-lg z-30 overflow-hidden">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary-50"
                      >
                        <span className="block text-xs font-semibold text-primary-900">{suggestion.title}</span>
                        <span className="block text-[11px] text-secondary-400">{suggestion.domain}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={activityDomain}
                onChange={(event) => setActivityDomain(event.target.value)}
                className="bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900"
              >
                <option value="">Domaine</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.name}>
                    {domain.name}
                  </option>
                ))}
              </select>
              <input
                value={activityLocation}
                onChange={(event) => setActivityLocation(event.target.value)}
                placeholder="Lieu"
                className="bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900 placeholder:text-secondary-300"
              />
              <input
                type="datetime-local"
                value={activityStartAt}
                onChange={(event) => setActivityStartAt(event.target.value)}
                className="bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900"
              />
              <input
                type="number"
                min="1"
                value={activityCapacity}
                onChange={(event) => setActivityCapacity(event.target.value)}
                placeholder="Places"
                className="bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900 placeholder:text-secondary-300"
              />
            </div>
          )}

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={type === "ACTIVITY" ? "Details, consignes, public vise..." : "Diffuser une info sur le campus..."}
            className="w-full bg-transparent border-none focus:ring-0 text-base text-primary-900 placeholder:text-secondary-300 resize-none min-h-16 pt-1 font-medium"
          />

          {mediaUrl && (
            <div className="mt-3 border border-secondary-100 rounded-sm overflow-hidden bg-secondary-50">
              <img src={mediaUrl} alt="Apercu" className="w-full max-h-64 object-cover" />
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="inline-flex items-center gap-2 border border-secondary-100 text-secondary-600 hover:text-primary-600 hover:border-primary-200 rounded-sm px-3 py-2 text-xs transition-colors disabled:opacity-50"
            >
              {uploadingMedia ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              IMAGE
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleMediaUpload(event)}
            />
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="URL image"
              className="flex-1 bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm text-primary-900 placeholder:text-secondary-300"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center pt-4 mt-2 border-t border-secondary-50">
            <div className="relative flex-1 max-w-sm">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-300" />
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="ia, sport, revision..."
                className="w-full bg-secondary-50 border border-secondary-100 rounded-sm py-2 pl-9 pr-3 text-xs text-primary-900 placeholder:text-secondary-300"
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium uppercase tracking-wide px-5 py-2 rounded-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              PUBLIER
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary-500 bg-primary-50 text-primary-600" : "border-secondary-100 text-secondary-500 hover:border-secondary-200"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Post({
  item,
  onPostChanged,
}: {
  item: FeedItem;
  onPostChanged: (post: PostResponse) => void;
}) {
  const { post, reasons } = item;
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const author = post.authorName || post.authorUsername || "Etudiant";
  const handle = post.authorUsername ? `@${post.authorUsername}` : "@uconnect";

  const toggleReaction = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const next = post.reactedByMe
        ? await feedApi.removeReaction(post.id)
        : await feedApi.react(post.id);
      onPostChanged(next);
    } finally {
      setBusy(false);
    }
  };

  const toggleParticipation = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const next = post.participationStatus === "GOING"
        ? await feedApi.leaveActivity(post.id)
        : await feedApi.joinActivity(post.id);
      onPostChanged(next);
    } finally {
      setBusy(false);
    }
  };

  const toggleComments = async () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (!nextOpen || comments.length > 0 || commentsLoading) {
      return;
    }
    setCommentsLoading(true);
    try {
      setComments(await feedApi.listComments(post.id));
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content || commentSaving) {
      return;
    }
    setCommentSaving(true);
    try {
      const nextComment = await feedApi.addComment(post.id, content);
      setComments((previous) => [...previous, nextComment]);
      setCommentDraft("");
      onPostChanged({ ...post, commentCount: post.commentCount + 1 });
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <article className="p-6 flex gap-4 hover:bg-secondary-50/30 transition-colors group">
      <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden flex-shrink-0">
        <img
          src={post.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author)}`}
          alt={author}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-primary-900">{author}</span>
              <span className="text-[11px] font-normal text-secondary-400">
                {handle} · {timeAgo(post.createdAt)}
              </span>
            </div>
            {reasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 border border-primary-100 rounded-sm px-2 py-1 text-[11px]"
                  >
                    <Sparkles size={11} />
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button className="text-secondary-300 hover:text-primary-500 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {post.activity && <ActivityBlock post={post} busy={busy} onToggleParticipation={() => void toggleParticipation()} />}

        {post.content && (
          <p className="text-sm text-primary-900 leading-relaxed font-normal my-4">{post.content}</p>
        )}

        {post.mediaUrl && (
          <div className="border border-secondary-100 rounded-sm overflow-hidden mb-4 bg-secondary-50">
            <img src={post.mediaUrl} alt="Publication" className="w-full h-full object-cover max-h-[420px]" />
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[11px] text-secondary-500 bg-secondary-50 border border-secondary-100 rounded-sm px-2 py-1">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between max-w-sm text-secondary-400">
          <PostAction
            icon={<MessageCircle size={16} />}
            count={post.commentCount}
            active={commentsOpen}
            onClick={() => void toggleComments()}
          />
          <PostAction
            icon={<Heart size={16} className={post.reactedByMe ? "fill-current" : ""} />}
            count={post.reactionCount}
            active={post.reactedByMe}
            onClick={() => void toggleReaction()}
          />
          <PostAction icon={<Users size={16} />} count={post.participantCount} />
        </div>

        {commentsOpen && (
          <CommentsPanel
            comments={comments}
            loading={commentsLoading}
            draft={commentDraft}
            saving={commentSaving}
            onDraftChange={setCommentDraft}
            onSubmit={(event) => void submitComment(event)}
          />
        )}
      </div>
    </article>
  );
}

function CommentsPanel({
  comments,
  loading,
  draft,
  saving,
  onDraftChange,
  onSubmit,
}: {
  comments: CommentResponse[];
  loading: boolean;
  draft: string;
  saving: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="mt-4 border-t border-secondary-100 pt-4">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-secondary-400">
          <Loader2 size={13} className="animate-spin" />
          Chargement des commentaires...
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-secondary-50 border border-secondary-100 rounded-sm px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-primary-900">{comment.authorName}</span>
                <span className="text-[11px] text-secondary-400">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-primary-900 mt-1">{comment.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-secondary-400">Aucun commentaire pour le moment.</p>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex gap-2 mt-3">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ajouter un commentaire"
          className="flex-1 bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm px-3 py-2 text-sm text-primary-900 placeholder:text-secondary-300"
        />
        <button
          type="submit"
          disabled={saving || draft.trim().length === 0}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-sm px-3 py-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

function ActivityBlock({
  post,
  busy,
  onToggleParticipation,
}: {
  post: PostResponse;
  busy: boolean;
  onToggleParticipation: () => void;
}) {
  const activity = post.activity;
  if (!activity) {
    return null;
  }
  const joined = post.participationStatus === "GOING";

  return (
    <div className="border border-secondary-100 bg-secondary-50/60 rounded-sm p-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-900">{activity.title}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-secondary-500">
            {(activity.domain || activity.category) && <span>{activity.domain || activity.category}</span>}
            {activity.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {activity.location}
              </span>
            )}
            {activity.startAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {formatDate(activity.startAt)}
              </span>
            )}
            {activity.capacity && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} />
                {post.participantCount}/{activity.capacity}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleParticipation}
          disabled={busy}
          className={`px-4 py-2 rounded-sm text-xs font-medium uppercase tracking-wide transition-colors disabled:opacity-50 ${joined ? "border border-primary-200 bg-white text-primary-600" : "bg-primary-500 hover:bg-primary-600 text-white"}`}
        >
          {joined ? "INSCRIT" : "JE PARTICIPE"}
        </button>
      </div>
    </div>
  );
}

function PostAction({
  icon,
  count,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 transition-colors p-1 ${active ? "text-primary-500" : "hover:text-primary-500"}`}
    >
      {icon}
      {count !== undefined && <span className="text-[11px] font-normal">{count}</span>}
    </button>
  );
}

function splitInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function timeAgo(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) {
    return "";
  }
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (minutes < 1) {
    return "maintenant";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}j`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
