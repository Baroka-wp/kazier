import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { members } from "@/lib/core";
import { ListMembersInputSchema } from "@/lib/core/members";
import { CreateMemberInput, UpdateMemberInput } from "@/lib/core/schemas/member";
import { Cuid } from "@/lib/core/schemas/common";
import { z } from "zod";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerMemberTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "members.list",
    title: "List members",
    description:
      "List members of the team with pagination, search, role/status filters. " +
      "Returns paginated list with role/isBoss/hasAuth flags.",
    inputSchema: ListMembersInputSchema,
    actor,
    call: members.list,
  });

  registerIdTool(server, {
    name: "members.get",
    title: "Get a single member",
    description: "Fetch one member by cuid.",
    actor,
    call: members.get,
  });

  registerCoreTool(server, {
    name: "members.create",
    title: "Create a member",
    description:
      "Create a new team member (no Auth account). Requires members.write scope. " +
      "Email becomes the unique identifier if provided.",
    inputSchema: CreateMemberInput,
    actor,
    call: members.create,
  });

  registerCoreTool(server, {
    name: "members.update",
    title: "Update a member",
    description: "Update a member's fields. Pass id + any subset of fields.",
    inputSchema: z.object({ id: Cuid, data: UpdateMemberInput }),
    actor,
    call: (a, args: { id: string; data: unknown }) => members.update(a, args.id, args.data),
  });

  registerIdTool(server, {
    name: "members.deactivate",
    title: "Deactivate a member (soft delete)",
    description: "Set isActive=false on a member. Auth and references are kept.",
    actor,
    call: members.deactivate,
  });

  registerCoreTool(server, {
    name: "members.search",
    title: "Autocomplete search by name",
    description: "Find up to N active members by partial first/last name match.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Partial name to search for"),
      limit: z.number().int().min(1).max(20).default(5),
    }),
    actor,
    call: (a, args: { query: string; limit?: number }) =>
      members.search(a, args.query, args.limit ?? 5),
  });
}
