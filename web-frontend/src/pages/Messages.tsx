import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import {
  Search,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  Smile,
  Paperclip,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { connectChatSocket } from "../realtime/chatSocket";

const CONVERSATIONS = [
  {
    id: 1,
    fullName: "Njou Gaby",
    handle: "@gaby_njou",
    lastMessage: "On se voit à la bibliothèque pour le projet ?",
    time: "12m",
    unread: true,
    isGroup: false,
    messages: [
      {
        id: 1,
        sender: "Njou Gaby",
        text: "Salut Michel, tu as pu regarder les documents pour le projet ?",
        isOwn: false,
        time: "14:02",
      },
      {
        id: 2,
        sender: "Michel Eloka",
        text: "Oui ! Je viens de finir l'analyse comparative.",
        isOwn: true,
        time: "14:05",
      },
      {
        id: 3,
        sender: "Njou Gaby",
        text: "On se voit à la bibliothèque pour mettre tout ça en commun ?",
        isOwn: false,
        time: "14:06",
      },
    ],
  },
  {
    id: 4,
    fullName: "Projet Hackathon 2026",
    handle: "Cercle • 5 membres",
    lastMessage: "Hamza Damouh: J'ai push le front sur Git.",
    time: "45m",
    unread: true,
    isGroup: true,
    members: ["Njou Gaby", "Hamza Damouh", "Michel Eloka", "Sophie Martin"],
    messages: [
      {
        id: 1,
        sender: "Njou Gaby",
        text: "Les gars, on en est où sur la base de données ?",
        isOwn: false,
        time: "15:20",
      },
      {
        id: 2,
        sender: "Hamza Damouh",
        text: "Tout est clean, j'ai fini les modèles.",
        isOwn: false,
        time: "15:25",
      },
      {
        id: 3,
        sender: "Sophie Martin",
        text: "Est-ce qu'on a prévu une démo en live ?",
        isOwn: false,
        time: "15:28",
      },
      {
        id: 4,
        sender: "Michel Eloka",
        text: "Oui Sophie, je m'en occupe demain matin.",
        isOwn: true,
        time: "15:30",
      },
      {
        id: 5,
        sender: "Hamza Damouh",
        text: "J'ai push le front sur Git.",
        isOwn: false,
        time: "15:45",
      },
    ],
  },
  {
    id: 2,
    fullName: "Hamza Damouh",
    handle: "@hamza_dmh",
    lastMessage: "Tu as fini l'exercice de maths ?",
    time: "2h",
    unread: false,
    isGroup: false,
    messages: [
      {
        id: 1,
        sender: "Michel Eloka",
        text: "Yo Hamza, tu t'en sors sur le chapitre 4 ?",
        isOwn: true,
        time: "10:15",
      },
      {
        id: 2,
        sender: "Hamza Damouh",
        text: "C'est chaud, je bloque sur la dérivée seconde.",
        isOwn: false,
        time: "10:20",
      },
      {
        id: 3,
        sender: "Hamza Damouh",
        text: "Tu as fini l'exercice de maths ?",
        isOwn: false,
        time: "10:21",
      },
    ],
  },
  {
    id: 5,
    fullName: "BDE - Organisation Soirée",
    handle: "Cercle • 12 membres",
    lastMessage: "Jean Dupont: On a loué la sono ?",
    time: "3h",
    unread: false,
    isGroup: true,
    members: ["Sophie Martin", "Michel Eloka", "Njou Gaby", "Jean Dupont"],
    messages: [
      {
        id: 1,
        sender: "Sophie Martin",
        text: "Quelqu'un a contacté le traiteur ?",
        isOwn: false,
        time: "09:00",
      },
      {
        id: 2,
        sender: "Njou Gaby",
        text: "Je les appelle à midi !",
        isOwn: false,
        time: "09:10",
      },
      {
        id: 3,
        sender: "Michel Eloka",
        text: "Ok, tiens-nous au courant du devis.",
        isOwn: true,
        time: "09:15",
      },
      {
        id: 4,
        sender: "Jean Dupont",
        text: "On a loué la sono ?",
        isOwn: false,
        time: "11:30",
      },
    ],
  },
];

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(CONVERSATIONS[0]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    const socket = connectChatSocket({
      onOpen: () => setIsWsConnected(true),
      onClose: () => setIsWsConnected(false),
      onError: () => setIsWsConnected(false),
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <Layout hideSidebarRight>
      <div className="flex h-full bg-white overflow-hidden font-body">
        <div className="w-[350px] border-r border-secondary-100 flex flex-col h-full bg-white shrink-0">
          <div className="p-6 border-b border-secondary-100">
            <h1 className="text-xl font-bold text-primary-900 mb-4 font-display">
              Messages
            </h1>
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2 pl-10 pr-4 text-xs font-normal tracking-normal transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {CONVERSATIONS.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 flex gap-3 cursor-pointer border-l-2 transition-all ${
                  selectedChat.id === chat.id
                    ? "bg-primary-50/30 border-primary-500"
                    : "border-transparent hover:bg-secondary-50"
                }`}
              >
                <div className="w-12 h-12 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                  {chat.isGroup ? (
                    <GroupAvatar members={chat.members || []} />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.fullName}`}
                      alt={chat.fullName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p
                      className={`text-sm font-semibold truncate ${chat.unread ? "text-primary-900" : "text-secondary-700"}`}
                    >
                      {chat.fullName}
                    </p>
                    <span className="text-[11px] font-normal text-secondary-400">
                      {chat.time}
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate leading-snug ${chat.unread ? "font-semibold text-primary-900" : "font-normal text-secondary-500"}`}
                  >
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full bg-white">
          <div className="h-[73px] px-6 border-b border-secondary-100 flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10 font-display">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                {selectedChat.isGroup ? (
                  <GroupAvatar members={selectedChat.members || []} />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.fullName}`}
                    alt={selectedChat.fullName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-900">
                  {selectedChat.fullName}
                </p>
                <p className="text-[11px] font-normal text-secondary-400">
                  {selectedChat.isGroup ? selectedChat.handle : (isWsConnected ? "En ligne (WS)" : "Hors ligne (WS)")}
                </p>
              </div>
            </div>
            <button className="text-secondary-400 hover:text-primary-500 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-secondary-50/10">
            <SectionHeader label="Discussion" />

            <div className="flex flex-col gap-6">
              {selectedChat.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  sender={msg.sender}
                  text={msg.text}
                  isOwn={msg.isOwn}
                  time={msg.time}
                />
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-secondary-100 bg-white">
            <div className="flex items-end gap-2 bg-secondary-50 border border-secondary-100 focus-within:bg-white focus-within:border-primary-500 transition-all rounded-sm p-2">
              <div className="flex gap-1 mb-1">
                <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                  <ImageIcon size={18} />
                </button>
                <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                  <Paperclip size={18} />
                </button>
                <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                  <Smile size={18} />
                </button>
              </div>
              <textarea
                placeholder="Votre message..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-primary-900 placeholder:text-secondary-300 resize-none h-10 py-2 font-normal"
              />
              <button className="mb-1 p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-sm transition-all group">
                <Send
                  size={18}
                  className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function GroupAvatar({ members }: { members: string[] }) {
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {members.slice(0, 4).map((name, i) => (
        <div key={i} className="overflow-hidden border-[0.5px] border-white/20">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
            alt="member"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  text,
  sender,
  isOwn,
  time,
}: {
  text: string;
  sender: string;
  isOwn: boolean;
  time: string;
}) {
  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-3`}
    >
      {!isOwn && (
        <div className="w-8 h-8 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sender}`}
            alt={sender}
          />
        </div>
      )}
      <div
        className={`max-w-[70%] group flex flex-col ${isOwn ? "items-end" : "items-start"}`}
      >
        {!isOwn && (
          <p className="text-[11px] font-semibold text-secondary-400 mb-1 ml-1">
            {sender}
          </p>
        )}
        <div
          className={`p-3 rounded-sm border transition-all ${
            isOwn
              ? "bg-primary-500 border-primary-600 text-white"
              : "bg-white border-secondary-100 text-primary-900"
          }`}
        >
          <p className="text-sm font-normal leading-relaxed">{text}</p>
        </div>
        <p
          className={`text-[11px] font-normal text-secondary-300 mt-1`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
