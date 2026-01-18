import { useState } from "react";
import {
  Image as ImageIcon,
  BarChart2,
  Smile,
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

export default function Feed() {
  const [activeTab, setActiveTab] = useState("discover");

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-secondary-100 flex">
        <TabButton
          active={activeTab === "discover"}
          onClick={() => setActiveTab("discover")}
          label="DÉCOUVRIR"
        />
        <TabButton
          active={activeTab === "events"}
          onClick={() => setActiveTab("events")}
          label="ÉVÉNEMENTS À VENIR"
        />
      </div>

      <CreatePostArea />

      <div className="divide-y divide-secondary-100">
        <Post
          author="NJONOU Gaby"
          handle="@gaby_njou"
          time="2h"
          content="Validation du stage au CERN. La recherche avance, les opportunités aussi. 🚀"
          replies={5}
          reposts={12}
          likes={42}
        />
        <Post
          author="Hamza Damouh"
          handle="@hamza_dmh"
          time="5h"
          content="Analyse comparative des architectures Transformer. Quelqu'un a exploré les limites des modèles de raisonnement récents ?"
          image="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80"
          replies={34}
          reposts={8}
          likes={128}
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] transition-all relative ${active ? "text-primary-500" : "text-secondary-400 hover:text-secondary-600"}`}
    >
      {label}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </button>
  );
}

function CreatePostArea() {
  const { user } = useAuth();

  return (
    <div className="p-6 border-b border-secondary-100">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden flex-shrink-0">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName ?? "User")}`} alt="Me" />
        </div>
        <div className="flex-1">
          <textarea
            placeholder="Diffuser une info sur le campus..."
            className="w-full bg-transparent border-none focus:ring-0 text-base text-primary-900 placeholder:text-secondary-300 resize-none h-12 pt-1 font-medium"
          />
          <div className="flex justify-between items-center pt-4 mt-2 border-t border-secondary-50">
            <div className="flex gap-1">
              <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                <ImageIcon size={18} />
              </button>
              <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                <BarChart2 size={18} />
              </button>
              <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                <Smile size={18} />
              </button>
            </div>
            <button className="bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-sm transition-all">
              PUBLIER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Post({
  author,
  handle,
  time,
  content,
  image,
  replies,
  reposts,
  likes,
}: any) {
  return (
    <div className="p-6 flex gap-4 hover:bg-secondary-50/30 transition-colors cursor-pointer group">
      <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden flex-shrink-0">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${author}`}
          alt={author}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-primary-900 uppercase tracking-tight">
              {author}
            </span>
            <span className="text-[10px] font-bold text-secondary-400 lowercase tracking-tighter">
              {handle} · {time}
            </span>
          </div>
          <button className="text-secondary-300 hover:text-primary-500 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>

        <p className="text-sm text-primary-900 leading-relaxed font-medium mb-4">
          {content}
        </p>

        {image && (
          <div className="border border-secondary-100 rounded-sm overflow-hidden mb-4 bg-secondary-50">
            <img
              src={image}
              alt="Content"
              className="w-full h-full object-cover max-h-[400px]"
            />
          </div>
        )}

        <div className="flex justify-between max-w-sm text-secondary-400">
          <PostAction icon={<MessageCircle size={16} />} count={replies} />
          <PostAction icon={<Repeat2 size={16} />} count={reposts} />
          <PostAction icon={<Heart size={16} />} count={likes} />
          <PostAction icon={<Bookmark size={16} />} />
          <PostAction icon={<Share size={16} />} />
        </div>
      </div>
    </div>
  );
}

function PostAction({ icon, count }: any) {
  return (
    <button className="flex items-center gap-2 hover:text-primary-500 transition-colors p-1">
      {icon}
      {count !== undefined && (
        <span className="text-[10px] font-black">{count}</span>
      )}
    </button>
  );
}