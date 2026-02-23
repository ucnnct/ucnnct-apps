import { Camera, ExternalLink, FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ChangeEvent } from "react";
import SectionHeader from "../common/SectionHeader";
import type { Project, ProjectRequest } from "../../api/projects";

interface ProjectsTabProps {
  isOwnProfile: boolean;
  projects: Project[];
  showProjectForm: boolean;
  editingProject: Project | null;
  projectForm: ProjectRequest;
  uploadingProjectImage: boolean;
  projectImagePreview: string | null;
  actionLoading: boolean;
  setProjectForm: (next: ProjectRequest) => void;
  setShowProjectForm: (open: boolean) => void;
  openProjectForm: (project?: Project) => void;
  onProjectImageChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProjectSubmit: () => Promise<void>;
  onProjectDelete: (projectId: number) => Promise<void>;
}

export default function ProjectsTab({
  isOwnProfile,
  projects,
  showProjectForm,
  editingProject,
  projectForm,
  uploadingProjectImage,
  projectImagePreview,
  actionLoading,
  setProjectForm,
  setShowProjectForm,
  openProjectForm,
  onProjectImageChange,
  onProjectSubmit,
  onProjectDelete,
}: ProjectsTabProps) {
  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <SectionHeader label={isOwnProfile ? "Mes realisations" : "Realisations"} />
        {isOwnProfile && (
          <button
            onClick={() => openProjectForm()}
            className="flex items-center gap-2 text-xs font-medium text-primary-500 uppercase tracking-wide hover:text-primary-700 transition-colors"
          >
            <Plus size={14} strokeWidth={3} />
            AJOUTER
          </button>
        )}
      </div>

      {showProjectForm && (
        <div className="border border-secondary-100 rounded-sm p-6 space-y-4 bg-secondary-50/30">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-medium text-primary-900 uppercase tracking-widest">
              {editingProject ? "MODIFIER LE PROJET" : "NOUVEAU PROJET"}
            </h3>
            <button
              onClick={() => setShowProjectForm(false)}
              className="text-secondary-400 hover:text-secondary-600"
            >
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Titre du projet"
            value={projectForm.title}
            onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
          />
          <textarea
            placeholder="Description"
            value={projectForm.description}
            onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors resize-none"
          />
          <input
            type="text"
            placeholder="Tags (separes par des virgules)"
            value={projectForm.tags}
            onChange={(event) => setProjectForm({ ...projectForm, tags: event.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
          />
          <input
            type="url"
            placeholder="Lien du projet (optionnel)"
            value={projectForm.link || ""}
            onChange={(event) => setProjectForm({ ...projectForm, link: event.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium focus:outline-none focus:border-primary-500 transition-colors"
          />
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-secondary-200 rounded-sm text-sm text-primary-900 font-medium hover:border-primary-500 transition-colors cursor-pointer">
              {uploadingProjectImage ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <span className="text-xs font-medium uppercase tracking-wide">
                {projectImagePreview ? "Changer l'image" : "Ajouter une image"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void onProjectImageChange(event)}
              />
            </label>
            {projectImagePreview && (
              <div className="mt-2 w-32 h-20 rounded-sm overflow-hidden border border-secondary-100">
                <img src={projectImagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowProjectForm(false)}
              className="px-6 py-2 border border-secondary-200 text-primary-900 font-medium text-xs uppercase tracking-wide rounded-sm hover:bg-secondary-50 transition-colors"
            >
              ANNULER
            </button>
            <button
              onClick={() => void onProjectSubmit()}
              disabled={actionLoading || !projectForm.title.trim()}
              className="px-6 py-2 bg-primary-500 text-white font-medium text-xs uppercase tracking-wide rounded-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : editingProject ? (
                "ENREGISTRER"
              ) : (
                "CREER"
              )}
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showProjectForm ? (
        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
          <p className="text-xs font-normal text-secondary-300">Aucun projet pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {projects.map((project) => (
            <div key={project.id} className="group">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="aspect-video bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden flex items-center justify-center">
                  {project.imageUrl ? (
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <FileText size={32} className="text-secondary-200" />
                  )}
                </div>
                <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                  <div className="flex gap-2">
                    {project.tags
                      .split(",")
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag.trim()} className="text-[11px] font-normal text-primary-500">
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-primary-900 group-hover:text-primary-500 transition-colors flex items-center gap-2">
                      {project.title}
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </h3>
                    {isOwnProfile && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openProjectForm(project)}
                          className="text-secondary-400 hover:text-primary-500"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => void onProjectDelete(project.id)}
                          className="text-secondary-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-secondary-500 text-sm leading-relaxed">{project.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
