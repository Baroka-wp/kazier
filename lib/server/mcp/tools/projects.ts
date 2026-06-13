import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projects } from "@/lib/core";
import {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
  AddProjectMemberInput,
} from "@/lib/core/schemas/project";
import { Cuid } from "@/lib/core/schemas/common";
import { z } from "zod";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerProjectTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "projects.list",
    title: "List projects",
    description:
      "List projects with pagination, search, status filter, or filtered by " +
      "memberId (= projects this member belongs to). Finance fields (budget, " +
      "contractValue) are masked unless caller has projects.finance scope.",
    inputSchema: ListProjectsInput,
    actor,
    call: projects.list,
  });

  registerIdTool(server, {
    name: "projects.get",
    title: "Get project details",
    description:
      "Fetch one project with its full member list. Finance fields masked unless " +
      "projects.finance scope.",
    actor,
    call: projects.get,
  });

  registerCoreTool(server, {
    name: "projects.create",
    title: "Create a project",
    description:
      "Create a new project. memberIds list will be added as ProjectMembers. " +
      "Emits project.created + project.member_added events (Slack DMs).",
    inputSchema: CreateProjectInput,
    actor,
    call: projects.create,
  });

  registerCoreTool(server, {
    name: "projects.update",
    title: "Update a project",
    description:
      "Update project fields. Touching budgetAmount/contractValue requires " +
      "projects.finance scope.",
    inputSchema: z.object({ id: Cuid, data: UpdateProjectInput }),
    actor,
    call: (a, args: { id: string; data: unknown }) => projects.update(a, args.id, args.data),
  });

  registerIdTool(server, {
    name: "projects.delete",
    title: "Delete a project",
    description: "Hard delete a project and all its children (cascade).",
    actor,
    call: projects.remove,
  });

  registerCoreTool(server, {
    name: "projects.add_member",
    title: "Add a member to a project",
    description: "Add (or update roleLabel of) a member on a project. Idempotent.",
    inputSchema: AddProjectMemberInput,
    actor,
    call: projects.addMember,
  });

  registerCoreTool(server, {
    name: "projects.remove_member",
    title: "Remove a member from a project",
    description: "Remove a project membership.",
    inputSchema: projects.RemoveMemberInput,
    actor,
    call: projects.removeMember,
  });
}
