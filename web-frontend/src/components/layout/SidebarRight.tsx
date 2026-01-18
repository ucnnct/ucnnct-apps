import { UserPlus, Clock, CalendarDays, BookOpen } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function SidebarRight() {
  return (
    <aside className="hidden xl:flex flex-col w-[320px] h-full py-6 space-y-8 shrink-0">
      <Panel>
        <div className="bg-primary-50 border border-primary-100 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-primary-600">
            <Clock size={12} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Prochain cours
            </span>
          </div>
          <p className="text-xs font-black text-primary-900 uppercase">
            Architecture Cloud
          </p>
          <p className="text-[10px] font-bold text-primary-500 mt-1 uppercase text-right">
            15:00 · Salle D20
          </p>
        </div>

        <div className="flex gap-3 px-1">
          <div className="mt-1">
            <CalendarDays size={14} className="text-accent-500" />
          </div>
          <div>
            <p className="text-[11px] font-black text-primary-900 leading-tight uppercase">
              Hackathon U-Connect
            </p>
            <p className="text-[9px] font-bold text-secondary-400 mt-1 uppercase">
              Demain · 09:00
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-1">
          <div className="mt-1">
            <BookOpen size={14} className="text-success-500" />
          </div>
          <div>
            <p className="text-[11px] font-black text-primary-900 leading-tight uppercase">
              Rendu Projet Maths
            </p>
            <p className="text-[9px] font-bold text-secondary-400 mt-1 uppercase">
              Vendredi · 23:59
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Tendances">
        <div className="px-2 space-y-5 mt-4">
          {[
            { tag: "#STAGE2026", desc: "1.2K posts" },
            { tag: "#CHATGPT", desc: "IA sur le campus" },
            { tag: "#MATHS_HELP", desc: "Entraide active" },
          ].map((item, i) => (
            <div key={i} className="group cursor-pointer">
              <p className="text-xs font-black text-primary-900 group-hover:text-primary-500 transition-colors uppercase tracking-tighter">
                {item.tag}
              </p>
              <p className="text-[9px] font-bold text-secondary-400 mt-1 uppercase">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="À suivre">
        <div className="px-2 space-y-4 mt-4">
          {[
            { fullName: "Michel Eloka", handle: "@MICHEL_E" },
            { fullName: "Njou Gaby", handle: "@GABY_NJOU" },
            { fullName: "Hamza Damouh", handle: "@HAMZA_D" },
          ].map((user, i) => (
            <div
              key={i}
              className="flex items-center justify-between group cursor-pointer px-2 py-1 hover:bg-secondary transition-colors rounded-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 avatar-sharp">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.fullName}`}
                    alt="User"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-primary-900 uppercase truncate">
                    {user.fullName}
                  </p>
                  <p className="text-[9px] font-bold text-secondary-400">
                    {user.handle}
                  </p>
                </div>
              </div>
              <button className="text-primary-500 hover:text-primary-700 transition-colors">
                <UserPlus size={16} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <footer className="mt-auto px-8 py-4 border-t border-secondary">
        <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-relaxed">
          © 2026 U-CONNECT
        </p>
      </footer>
    </aside>
  );
}

const Panel = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="px-2 space-y-4 mt-4">
      {title && <SectionHeader label={title} />}
      {children}
    </div>
  );
};
