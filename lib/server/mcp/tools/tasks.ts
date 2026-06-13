import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tasks } from "@/lib/core";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksInput,
  ChangeTaskStatusInput,
  AssignTaskInput,
} from "@/lib/core/schemas/task";
import { Cuid } from "@/lib/core/schemas/common";
import { z } from "zod";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerTaskTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "tasks.list",
    title: "List tasks",
    description:
      "List tasks with rich filters: project, status (TODO|IN_PROGRESS|REVIEW|" +
      "DONE|CANCELLED), priority (LOW|MEDIUM|HIGH|URGENT), assignee.",
    inputSchema: ListTasksInput,
    actor,
    call: tasks.list,
  });

  registerIdTool(server, {
    name: "tasks.get",
    title: "Get a task",
    description: "Fetch one task with its project + assignees.",
    actor,
    call: tasks.get,
  });

  registerCoreTool(server, {
    name: "tasks.create",
    title: "Create a task",
    description:
      "Create a task. assigneeIds[] populates TaskAssignment + emits " +
      "task.assigned event (Slack DM to each assignee).",
    inputSchema: CreateTaskInput,
    actor,
    call: tasks.create,
  });

  registerCoreTool(server, {
    name: "tasks.update",
    title: "Update a task",
    description:
      "Update task fields. If assigneeIds is provided, the assignment set is " +
      "replaced (added/removed members are diffed). Status transitions emit " +
      "task.status_changed event.",
    inputSchema: z.object({ id: Cuid, data: UpdateTaskInput }),
    actor,
    call: (a, args: { id: string; data: unknown }) => tasks.update(a, args.id, args.data),
  });

  registerCoreTool(server, {
    name: "tasks.change_status",
    title: "Change task status",
    description:
      "Shortcut to change status only (optionally set actualHours when moving " +
      "to DONE). Rejects reactivating a CANCELLED task.",
    inputSchema: ChangeTaskStatusInput,
    actor,
    call: tasks.changeStatus,
  });

  registerCoreTool(server, {
    name: "tasks.assign",
    title: "Replace assignees",
    description:
      "Replace the entire set of assignees. Computes added/removed diff and " +
      "only DMs newly added members.",
    inputSchema: AssignTaskInput,
    actor,
    call: tasks.assign,
  });

  registerIdTool(server, {
    name: "tasks.delete",
    title: "Delete a task",
    description: "Hard delete a task (cascade comments + assignments).",
    actor,
    call: tasks.remove,
  });

  registerCoreTool(server, {
    name: "tasks.add_comment",
    title: "Add a comment to a task",
    description:
      "Append a comment authored by the current actor (memberId required). " +
      "Use this to leave context that other members can read.",
    inputSchema: tasks.AddCommentInput,
    actor,
    call: tasks.addComment,
  });

  registerIdTool(server, {
    name: "tasks.list_comments",
    title: "List comments of a task",
    description: "All comments on a task, oldest first.",
    actor,
    call: tasks.listComments,
  });
}
