import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { notes } from "@/lib/core";
import { CreateNoteInput, UpdateNoteInput, ListNotesInput } from "@/lib/core/schemas/note";
import { Cuid } from "@/lib/core/schemas/common";
import { z } from "zod";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerNoteTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "notes.list",
    title: "List notes of a project",
    description:
      "List project notes (the project's text memory / Confluence-light). " +
      "Filter by pinned, tag, or search by title. Sort: pinned-first, then " +
      "updatedAt desc.",
    inputSchema: ListNotesInput,
    actor,
    call: notes.list,
  });

  registerIdTool(server, {
    name: "notes.get",
    title: "Get a single note",
    description: "Fetch one note (body is TipTap JSON).",
    actor,
    call: notes.get,
  });

  registerCoreTool(server, {
    name: "notes.create",
    title: "Create a note",
    description:
      "Append a note to a project. body is free-form JSON (TipTap document). " +
      "tags help future retrieval, pinned keeps it on top of the list.",
    inputSchema: CreateNoteInput,
    actor,
    call: notes.create,
  });

  registerCoreTool(server, {
    name: "notes.update",
    title: "Update a note",
    description: "Update title / body / tags / pinned of a note.",
    inputSchema: z.object({ id: Cuid, data: UpdateNoteInput }),
    actor,
    call: (a, args: { id: string; data: unknown }) => notes.update(a, args.id, args.data),
  });

  registerIdTool(server, {
    name: "notes.delete",
    title: "Delete a note",
    description: "Hard delete a note.",
    actor,
    call: notes.remove,
  });
}
