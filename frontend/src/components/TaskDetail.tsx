import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listComments, addComment, updateTask, deleteTask } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import type { ApiTask, ApiProjectMember, TaskStatus } from "@/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/types";
import { relativeTime } from "@/lib/format";

type Props = {
  task: ApiTask;
  projectId: string;
  members: ApiProjectMember[];
  canEdit: boolean;
  onClose: () => void;
};

export function TaskDetail({ task, projectId, members, canEdit, onClose }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [body, setBody] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["activity", projectId] });
  };

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => listComments(task.id),
  });

  const save = useMutation({
    mutationFn: () =>
      updateTask(task.id, { title, description, status, assigneeId: assigneeId || null }),
    onSuccess: () => {
      invalidateBoard();
      toast({ tone: "success", title: "Task updated" });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't save", description: msg(e) }),
  });

  const remove = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      invalidateBoard();
      toast({ tone: "success", title: "Task deleted" });
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't delete", description: msg(e) }),
  });

  const comment = useMutation({
    mutationFn: (value: string) => addComment(task.id, value),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", task.id] });
      queryClient.invalidateQueries({ queryKey: ["activity", projectId] });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't post comment", description: msg(e) }),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-8 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl animate-scale-in rounded-2xl border border-line bg-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-base font-semibold">{canEdit ? "Edit task" : "Task"}</h2>
          <button onClick={onClose} className="text-muted transition-colors hover:text-ink" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scroll-slim px-6 py-5">
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              className="field disabled:opacity-70"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder={canEdit ? "Add more detail..." : "No description."}
              className="field resize-none disabled:opacity-70"
            />
          </label>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={!canEdit}
                className="field disabled:opacity-70"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Assignee</span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canEdit}
                className="field disabled:opacity-70"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {canEdit && (
            <div className="mb-6 flex items-center justify-between border-b border-line pb-5">
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="text-[13px] font-medium text-danger hover:underline"
              >
                Delete task
              </button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
                {save.isPending ? <Spinner /> : null}
                {save.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold">Comments</h3>
              <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
                {comments?.length ?? 0}
              </span>
            </div>

            {loadingComments && <p className="text-[13px] text-muted">Loading...</p>}
            {comments && comments.length === 0 && (
              <p className="mb-3 text-[13px] text-faint">No comments yet.</p>
            )}

            <ul className="mb-4 space-y-3.5">
              {comments?.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author.name} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-ink">{c.author.name}</span>
                      <span className="text-[11px] text-faint">{relativeTime(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {canEdit ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = body.trim();
                  if (v) comment.mutate(v);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const v = body.trim();
                      if (v) comment.mutate(v);
                    }
                  }}
                  rows={1}
                  placeholder="Write a comment..."
                  className="field max-h-32 min-h-[42px] flex-1 resize-none"
                />
                <button type="submit" disabled={comment.isPending || !body.trim()} className="btn-primary">
                  {comment.isPending ? <Spinner /> : "Post"}
                </button>
              </form>
            ) : (
              <p className="rounded-lg bg-subtle px-3 py-2.5 text-[12px] text-muted">
                Viewers can read comments but not post.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : "Please try again.";
}
