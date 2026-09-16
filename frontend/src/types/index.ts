export type Role = "admin" | "member" | "viewer";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
};

export type ApiTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  createdById: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee?: ApiUser | null;
};

export type ApiProjectMember = {
  id: string;
  role: Role;
  user: ApiUser;
};

export type ApiProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: ApiUser;
  memberships: ApiProjectMember[];
  tasks: ApiTask[];
  createdAt: string;
  updatedAt: string;
};

export type ApiComment = {
  id: string;
  taskId: string;
  body: string;
  author: ApiUser;
  createdAt: string;
};

export type ActivityAction =
  | "task_created"
  | "task_status_changed"
  | "task_assignee_changed"
  | "comment_added";

export type ApiActivity = {
  id: string;
  projectId: string;
  taskId: string | null;
  actor: ApiUser | null;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  summary: string;
  createdAt: string;
};

export type ExportSummary = {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { taskId?: string; error: string }[];
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

// Tailwind color token per status, used for column rails and card stripes.
export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#64748B",
  in_progress: "#2E7BF6",
  review: "#F59E0B",
  done: "#14A06E",
};
