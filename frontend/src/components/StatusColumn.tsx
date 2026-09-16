import { useState } from "react";
import { TaskCard } from "./TaskCard";
import type { ApiTask, TaskStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLOR } from "@/types";

type Props = {
  status: TaskStatus;
  tasks: ApiTask[];
  canEdit: boolean;
  isAdding: boolean;
  onTaskClick: (task: ApiTask) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onAddTask: (title: string, status: TaskStatus) => void;
};

export function StatusColumn({
  status,
  tasks,
  canEdit,
  isAdding,
  onTaskClick,
  onDropTask,
  onAddTask,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const color = STATUS_COLOR[status];

  function submit() {
    const value = title.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    onAddTask(value, status);
    setTitle("");
    setAdding(false);
  }

  return (
    <section
      onDragOver={canEdit ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={() => setDragOver(false)}
      onDrop={
        canEdit
          ? (e) => {
              e.preventDefault();
              setDragOver(false);
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDropTask(id, status);
            }
          : undefined
      }
      className={`flex flex-col rounded-2xl border transition-colors ${
        dragOver ? "border-primary bg-primary-soft/60" : "border-line bg-subtle/50"
      }`}
    >
      <header className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <h3 className="text-[13px] font-semibold text-ink">{STATUS_LABELS[status]}</h3>
        </div>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
          {tasks.length}
        </span>
      </header>

      <div className="flex min-h-[72px] flex-1 flex-col gap-2.5 px-2.5 pb-1">
        {tasks.length === 0 && !adding && (
          <p className="px-1 py-7 text-center text-[12px] text-faint">
            {canEdit ? "Drop tasks here" : "No tasks"}
          </p>
        )}
        {tasks.map((t, i) => (
          <div key={t.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <TaskCard
              task={t}
              onClick={onTaskClick}
              draggable={canEdit}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
            />
          </div>
        ))}
        {adding && (
          <div className="rounded-xl border border-primary bg-surface p-2.5 shadow-card">
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
              placeholder="What needs doing?"
              className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={submit} disabled={isAdding} className="btn-primary px-3 py-1.5 text-[13px]">
                Add
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                }}
                className="text-[13px] font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {canEdit && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="mx-2.5 mb-2.5 mt-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-left text-[13px] font-medium text-muted transition-colors hover:border-primary hover:text-primary"
        >
          + Add task
        </button>
      )}
    </section>
  );
}
