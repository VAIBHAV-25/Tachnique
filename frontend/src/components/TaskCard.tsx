import type { ApiTask } from "@/types";
import { STATUS_COLOR } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  task: ApiTask;
  onClick?: (task: ApiTask) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
};

export function TaskCard({ task, onClick, draggable, onDragStart, onDragEnd }: Props) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(task)}
      className={`group w-full rounded-xl border border-line bg-surface p-3.5 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift active:scale-[.99] ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{ borderLeft: `3px solid ${STATUS_COLOR[task.status]}` }}
    >
      <p className="mb-2.5 line-clamp-3 text-sm font-medium leading-snug text-ink">{task.title}</p>
      <div className="flex items-center justify-between">
        {task.assignee ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={task.assignee.name} size={20} />
            <span className="text-[12px] text-muted">{task.assignee.name}</span>
          </span>
        ) : (
          <span className="text-[12px] text-faint">unassigned</span>
        )}
        {task.description && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-faint" aria-hidden>
            <path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
