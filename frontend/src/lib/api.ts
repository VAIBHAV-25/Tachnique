import { apiFetch } from "./api-client";
import type {
  ApiProjectDetail,
  ApiTask,
  ApiComment,
  ApiActivity,
  ExportSummary,
  TaskStatus,
} from "@/types";

export const createProject = (input: { name: string; description?: string }) =>
  apiFetch<{ project: { id: string; name: string } }>(`/api/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.project);

export const getProject = (id: string) =>
  apiFetch<{ project: ApiProjectDetail }>(`/api/projects/${id}`).then((r) => r.project);

export const listComments = (taskId: string) =>
  apiFetch<{ comments: ApiComment[] }>(`/api/tasks/${taskId}/comments`).then((r) => r.comments);

export const addComment = (taskId: string, body: string) =>
  apiFetch<{ comment: ApiComment }>(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }).then((r) => r.comment);

export const listActivity = (projectId: string) =>
  apiFetch<{ activities: ApiActivity[] }>(`/api/projects/${projectId}/activity`).then(
    (r) => r.activities,
  );

export const exportProject = (projectId: string) =>
  apiFetch<ExportSummary>(`/api/projects/${projectId}/export`, { method: "POST" });

export const createTask = (projectId: string, input: { title: string; status: TaskStatus }) =>
  apiFetch<{ task: ApiTask }>(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.task);

export const updateTask = (taskId: string, input: Partial<ApiTask>) =>
  apiFetch<{ task: ApiTask }>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((r) => r.task);

export const deleteTask = (taskId: string) =>
  apiFetch<{ ok: true }>(`/api/tasks/${taskId}`, { method: "DELETE" });
