import { useQuery } from "@tanstack/react-query";
import { listActivity } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { ActivityAction } from "@/types";

const ACTION_DOT: Record<ActivityAction, string> = {
  task_created: "#5B5BD6",
  task_status_changed: "#2E7BF6",
  task_assignee_changed: "#F59E0B",
  comment_added: "#14A06E",
};

export function ActivityFeed({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity", projectId],
    queryFn: () => listActivity(projectId),
  });

  return (
    <aside className="rounded-2xl border border-line bg-surface shadow-card">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary" aria-hidden>
          <path d="M3 12h4l2 6 4-14 2 8h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="font-display text-sm font-semibold">Activity</h2>
      </header>

      <div className="p-4">
        {isLoading && <p className="text-[13px] text-muted">Loading...</p>}
        {data && data.length === 0 && (
          <p className="py-4 text-center text-[13px] text-faint">No activity yet.</p>
        )}
        {data && data.length > 0 && (
          <ol className="relative">
            <span
              className="absolute bottom-1 left-[4px] top-1 w-px origin-top animate-spine-grow bg-line"
              aria-hidden
            />
            {data.map((a, i) => (
              <li
                key={a.id}
                className="relative flex animate-fade-up gap-3 pb-4 last:pb-0"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className="relative z-10 mt-1 h-[9px] w-[9px] shrink-0 rounded-full ring-4 ring-surface"
                  style={{ background: ACTION_DOT[a.action] }}
                />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug">
                    <span className="font-semibold text-ink">{a.actor?.name ?? "Someone"}</span>{" "}
                    <span className="text-muted">{a.summary}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">{relativeTime(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
