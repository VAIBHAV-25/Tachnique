import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken, getStoredUser } from "@/lib/api-client";
import { getProject, createTask, updateTask } from "@/lib/api";
import { Header } from "@/components/Header";
import { StatusColumn } from "@/components/StatusColumn";
import { TaskDetail } from "@/components/TaskDetail";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ExportButton } from "@/components/ExportButton";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useToast } from "@/components/ui/Toast";
import type { ApiProjectMember, ApiTask, Role, TaskStatus } from "@/types";
import { STATUS_ORDER } from "@/types";

export default function ProjectPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTask, setActiveTask] = useState<ApiTask | null>(null);

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const me = useMemo(() => getStoredUser(), []);
  const myRole: Role | null = useMemo(() => {
    if (!project || !me) return null;
    return project.memberships.find((m) => m.user.id === me.id)?.role ?? null;
  }, [project, me]);
  const canEdit = myRole === "admin" || myRole === "member";

  const tasksByStatus = useMemo(() => {
    const g: Record<TaskStatus, ApiTask[]> = { todo: [], in_progress: [], review: [], done: [] };
    project?.tasks.forEach((t) => g[t.status].push(t));
    return g;
  }, [project]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["project", id] });
    queryClient.invalidateQueries({ queryKey: ["activity", id] });
  };

  const create = useMutation({
    mutationFn: (input: { title: string; status: TaskStatus }) => createTask(id!, input),
    onSuccess: invalidate,
    onError: (e) => toast({ tone: "error", title: "Couldn't add task", description: err(e) }),
  });

  const move = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onSuccess: invalidate,
    onError: (e) => toast({ tone: "error", title: "Couldn't move task", description: err(e) }),
  });

  function onDropTask(taskId: string, status: TaskStatus) {
    const t = project?.tasks.find((x) => x.id === taskId);
    if (!t || t.status === status) return;
    move.mutate({ taskId, status });
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All projects
        </Link>

        {isLoading && <BoardSkeleton />}
        {error && (
          <p className="mt-6 text-sm text-danger">
            {error instanceof Error ? error.message : "Failed to load project"}
          </p>
        )}

        {project && (
          <>
            <div className="mb-7 mt-4 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="truncate text-2xl font-bold">{project.name}</h1>
                  {myRole && <RoleBadge role={myRole} />}
                </div>
                {project.description && (
                  <p className="mt-1.5 max-w-2xl text-sm text-muted">{project.description}</p>
                )}
                <div className="mt-3.5 flex items-center gap-3">
                  <MemberStack members={project.memberships} />
                  <span className="text-[13px] text-muted">
                    {project.memberships.length} members, owner {project.owner.name}
                  </span>
                </div>
              </div>
              {canEdit && <ExportButton projectId={project.id} />}
            </div>

            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {STATUS_ORDER.map((s) => (
                    <StatusColumn
                      key={s}
                      status={s}
                      tasks={tasksByStatus[s]}
                      canEdit={canEdit}
                      isAdding={create.isPending}
                      onTaskClick={setActiveTask}
                      onDropTask={onDropTask}
                      onAddTask={(title, status) => create.mutate({ title, status })}
                    />
                  ))}
                </div>
              </div>
              <div className="xl:w-80 xl:shrink-0">
                <ActivityFeed projectId={project.id} />
              </div>
            </div>
          </>
        )}
      </main>

      {activeTask && project && (
        <TaskDetail
          task={activeTask}
          projectId={id!}
          members={project.memberships}
          canEdit={canEdit}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  );
}

function MemberStack({ members }: { members: ApiProjectMember[] }) {
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((m) => (
          <Avatar key={m.id} name={m.user.name} size={26} ring />
        ))}
      </div>
      {extra > 0 && <span className="ml-2 text-[12px] font-medium text-muted">+{extra}</span>}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-subtle/60" />
      ))}
    </div>
  );
}

function err(e: unknown) {
  return e instanceof Error ? e.message : "Please try again.";
}
