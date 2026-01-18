import { useState } from "react";
import Layout from "../components/layout/Layout";
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  GraduationCap,
  MoreHorizontal,
  LayoutGrid,
  FileText,
  Award,
  ExternalLink,
  Plus,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";

const PROJECTS = [
  {
    id: 1,
    title: "U-Connect Design System",
    description:
      "Conception d'un système de design complet basé sur les principes du Swiss Design.",
    tags: ["REACT", "TAILWIND"],
    image:
      "https://images.unsplash.com/photo-1581291518062-c12427a9740a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "EcoTrack Mobile App",
    description:
      "Application mobile permettant aux étudiants de suivre leur empreinte carbone.",
    tags: ["FLUTTER", "FIREBASE"],
    image:
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80",
  },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState("posts");

  return (
    <Layout hideSidebarRight={true}>
      <div className="px-8 pt-8 flex flex-col bg-white min-h-screen font-body">
        <div className="h-48 bg-secondary-100 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-secondary-200/50"></div>
        </div>

        <div className="px-8 pb-8 border-b border-secondary-100">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            <div className="w-32 h-32 bg-white p-1 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
              <div className="w-full h-full bg-secondary-50 rounded-sm overflow-hidden border border-secondary-100">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michel%20Eloka"
                  alt="Michel Eloka"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2">
              <button className="px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-primary-900 font-black text-[10px] uppercase tracking-widest rounded-sm transition-all active:scale-95">
                MODIFIER LE PROFIL
              </button>
              <button className="p-2 border border-secondary-200 rounded-sm hover:bg-secondary-50 transition-all text-secondary-600">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-primary-900 uppercase tracking-tight font-display">
              Michel Eloka
            </h1>
            <p className="text-sm font-bold text-secondary-400 uppercase tracking-widest">
              @MICHEL_ELK
            </p>
          </div>

          <p className="mt-4 text-primary-900 font-medium leading-relaxed max-w-2xl">
            Étudiant en 3ème année d'Informatique. Passionné par le design
            système et le développement Fullstack. Co-fondateur du Cercle "Code
            & Coffee". ☕️💻
          </p>

          <div className="mt-6 flex flex-wrap gap-y-2 gap-x-6">
            <InfoItem
              icon={<GraduationCap size={16} />}
              text="Université de Technologie"
            />
            <InfoItem icon={<MapPin size={16} />} text="Paris, France" />
            <InfoItem
              icon={<LinkIcon size={16} />}
              text="micheleloka.dev"
              color="text-primary-500"
            />
            <InfoItem
              icon={<Calendar size={16} />}
              text="Inscrit en Janvier 2024"
            />
          </div>

          <div className="mt-6 flex gap-6">
            <div className="flex gap-1.5 items-baseline">
              <span className="font-black text-primary-900 text-lg">1,248</span>
              <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                Relations
              </span>
            </div>
            <div className="flex gap-1.5 items-baseline">
              <span className="font-black text-primary-900 text-lg">452</span>
              <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                Abonnements
              </span>
            </div>
          </div>
        </div>

        <div className="flex border-b border-secondary-100 bg-white sticky top-0 z-10">
          <ProfileTab
            active={activeTab === "posts"}
            onClick={() => setActiveTab("posts")}
            icon={<LayoutGrid size={16} />}
            label="POSTS"
          />
          <ProfileTab
            active={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
            icon={<FileText size={16} />}
            label="PROJETS"
          />
          <ProfileTab
            active={activeTab === "awards"}
            onClick={() => setActiveTab("awards")}
            icon={<Award size={16} />}
            label="BADGES"
          />
        </div>

        <div className="p-8 flex-1">
          {activeTab === "posts" && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
              <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                Aucun post public
              </p>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <SectionHeader label="Mes réalisations" />
                <button className="flex items-center gap-2 text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-700 transition-colors">
                  <Plus size={14} strokeWidth={3} />
                  AJOUTER
                </button>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {PROJECTS.map((project) => (
                  <div key={project.id} className="group cursor-pointer">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="aspect-video bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                      <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                        <div className="flex gap-2">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[8px] font-black text-primary-500 tracking-tighter"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-lg font-black text-primary-900 uppercase tracking-tight group-hover:text-primary-500 transition-colors flex items-center gap-2">
                          {project.title}
                          <ExternalLink size={14} />
                        </h3>
                        <p className="text-secondary-500 text-sm leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "awards" && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
              <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
                Aucun badge pour le moment
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({
  icon,
  text,
  color = "text-secondary-500",
}: {
  icon: React.ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-tight">
        {text}
      </span>
    </div>
  );
}

function ProfileTab({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black tracking-[0.2em] transition-all relative ${active ? "text-primary-500" : "text-secondary-400 hover:text-secondary-600"}`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </button>
  );
}
