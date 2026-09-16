import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api-client";
import { Header } from "@/components/Header";
import { NewProjectModal } from "@/components/NewProjectModal";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { avatarColor } from "@/lib/format";
import type { Role } from "@/types";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  owner: { id: string; name: string; email: string };
  taskCount: number;
  createdAt: string;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: ProjectSummary[] }>("/api/projects"),
  });

  const projects = data?.projects ?? [];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4 animate-fade-up">
          <div>
            <p className="eyebrow mb-2">Workspace</p>
            <h1 className="text-3xl font-bold">Your projects</h1>
            {data && (
              <p className="text-muted text-sm mt-1.5">
                {projects.length} {projects.length === 1 ? "project" : "projects"} you belong to.
              </p>
            )}
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New project
          </button>
        </div>

        {isLoading && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-40 rounded-xl border border-line bg-surface animate-pulse" />
            ))}
          </ul>
        )}

        {error && (
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </p>
        )}

        {data && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
            <p className="font-display text-lg font-semibold">No projects yet</p>
            <p className="text-sm text-muted mt-1 mb-5">Create your first project to get started.</p>
            <button onClick={() => setShowNew(true)} className="btn-primary mx-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New project
            </button>
          </div>
        )}

        {projects.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 55}ms` }}>
                <Link
                  to={`/projects/${p.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-transparent"
                >
                  <span className="h-1 w-full" style={{ background: avatarColor(p.id) }} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h2 className="font-display font-semibold leading-tight text-ink transition-colors group-hover:text-primary">
                        {p.name}
                      </h2>
                      <RoleBadge role={p.role} />
                    </div>
                    <p className="mb-5 line-clamp-2 flex-1 text-sm text-muted">
                      {p.description || "No description."}
                    </p>
                    <div className="flex items-center justify-between border-t border-line pt-4">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8 11l2.2 2.2L16 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {p.taskCount} {p.taskCount === 1 ? "task" : "tasks"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={p.owner.name} size={22} />
                        <span className="text-[13px] text-muted">{p.owner.name}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
