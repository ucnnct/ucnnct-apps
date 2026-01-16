import { TrendingUp, UserPlus } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function SidebarRight() {
  return (
    <aside className="hidden xl:flex flex-col w-[320px] h-full py-6 space-y-8 shrink-0">
      <div>
        <SectionHeader label="Tendances" />
        <div className="px-6 space-y-6 mt-4">
          {[
            { tag: "#STAGE2026", desc: "Carrière • 1.2K posts" },
            { tag: "#HACKATHON", desc: "Événement • 856 posts" },
            { tag: "#EXAMS_MATHS", desc: "Études • 542 posts" },
          ].map((item, i) => (
            <div key={i} className="group cursor-pointer">
              <p className="text-xs font-black text-primary-900 group-hover:text-primary-500 transition-colors">
                {item.tag}
              </p>
              <p className="text-[9px] font-bold capitalize text-secondary-400 tracking-wider mt-1">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8 ">
        <SectionHeader label="À suivre" />
        <div className="px-6 space-y-4 mt-4">
          {[
            { fullName: "Michel Eloka", handle: "@MICHEL_E" },
            { fullName: "Njou Gaby", handle: "@GABY_NJOU" },
            { fullName: "Hamza Damouh", handle: "@HAMZA_D" },
          ].map((user, i) => (
            <div
              key={i}
              className="flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden flex-shrink-0">
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
      </div>

      <footer className="mt-auto px-8 py-4 border-t border-secondary-100">
        <p className="text-[9px] font-black text-secondary-300 uppercase tracking-widest leading-relaxed">
          © 2026 U-CONNECT
        </p>
      </footer>
    </aside>
  );
}