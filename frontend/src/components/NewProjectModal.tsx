import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProject } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = useMutation({
    mutationFn: () =>
      createProject({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ tone: "success", title: "Project created", description: project.name });
      navigate(`/projects/${project.id}`);
    },
    onError: (e) =>
      toast({
        tone: "error",
        title: "Couldn't create project",
        description: e instanceof Error ? e.message : "Please try again.",
      }),
  });

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 120;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-12 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-2xl border border-line bg-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-base font-semibold">New project</h2>
          <button onClick={onClose} className="text-muted transition-colors hover:text-ink" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) create.mutate();
          }}
          className="px-6 py-5"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Q4 Roadmap"
              className="field"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Description <span className="text-faint">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's this project about?"
              className="field resize-none"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={!valid || create.isPending} className="btn-primary">
              {create.isPending ? <Spinner /> : null}
              {create.isPending ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
