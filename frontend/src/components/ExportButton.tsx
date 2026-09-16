import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { exportProject } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function ExportButton({ projectId }: { projectId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const s = await exportProject(projectId);
      const parts = [`${s.created} created`, `${s.updated} updated`];
      if (s.failed) parts.push(`${s.failed} failed`);
      toast({
        tone: s.failed ? "info" : "success",
        title: "Exported to Airtable",
        description: `${s.total} ${s.total === 1 ? "task" : "tasks"}, ${parts.join(", ")}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["activity", projectId] });
    } catch (e) {
      toast({
        tone: "error",
        title: "Export failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={run} disabled={loading} className="btn-ghost">
      {loading ? (
        <Spinner size={15} />
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 15V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
      {loading ? "Exporting..." : "Export to Airtable"}
    </button>
  );
}
