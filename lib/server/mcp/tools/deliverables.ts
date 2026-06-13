import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { deliverables } from "@/lib/core";
import {
  CreateDeliverableInput,
  UpdateDeliverableInput,
  ListDeliverablesInput,
} from "@/lib/core/schemas/deliverable";
import { Cuid } from "@/lib/core/schemas/common";
import { z } from "zod";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerDeliverableTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "deliverables.list",
    title: "List deliverables",
    description:
      "List deliverables (cadence: DAILY|WEEKLY|MONTHLY|MILESTONE). Includes " +
      "completion ratio derived from child tasks (doneTaskCount/taskCount).",
    inputSchema: ListDeliverablesInput,
    actor,
    call: deliverables.list,
  });

  registerIdTool(server, {
    name: "deliverables.get",
    title: "Get a deliverable",
    description: "Fetch one deliverable with its task counts.",
    actor,
    call: deliverables.get,
  });

  registerCoreTool(server, {
    name: "deliverables.create",
    title: "Create a deliverable",
    description:
      "Create a deliverable. parentId can point to another deliverable (must be " +
      "in the same project) to build the monthly→weekly→tasks hierarchy.",
    inputSchema: CreateDeliverableInput,
    actor,
    call: deliverables.create,
  });

  registerCoreTool(server, {
    name: "deliverables.update",
    title: "Update a deliverable",
    description:
      "Update fields. Setting status=DONE auto-sets completedAt (and reverts on " +
      "rollback). Emits deliverable.status_changed.",
    inputSchema: z.object({ id: Cuid, data: UpdateDeliverableInput }),
    actor,
    call: (a, args: { id: string; data: unknown }) => deliverables.update(a, args.id, args.data),
  });

  registerIdTool(server, {
    name: "deliverables.delete",
    title: "Delete a deliverable",
    description: "Delete (rejected if it has children — delete children first).",
    actor,
    call: deliverables.remove,
  });

  registerCoreTool(server, {
    name: "deliverables.tree",
    title: "Get deliverable hierarchy for a project",
    description:
      "Returns the deliverables of a project as a tree (roots → children). " +
      "Useful to inspect monthly→weekly structure at a glance.",
    inputSchema: deliverables.GetTreeInput,
    actor,
    call: deliverables.tree,
  });
}
