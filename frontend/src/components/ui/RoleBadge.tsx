import type { Role } from "@/types";

const STYLES: Record<Role, string> = {
  admin: "bg-primary-soft text-primary",
  member: "bg-[#E9F1FE] text-status-progress",
  viewer: "bg-subtle text-muted",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[role]}`}
    >
      {role}
    </span>
  );
}
