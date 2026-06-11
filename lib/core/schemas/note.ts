import { z } from "zod";
import { Cuid, NonEmptyString, Pagination } from "./common";

/**
 * Body : JSON libre (TipTap document JSON typiquement).
 * On ne valide pas la structure interne ici — c'est l'éditeur qui garantit.
 */
export const TipTapJson = z.unknown();

export const CreateNoteInput = z.object({
  projectId: Cuid,
  title: NonEmptyString.max(200),
  body: TipTapJson,
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  pinned: z.boolean().default(false),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInput>;

export const UpdateNoteInput = CreateNoteInput.partial().omit({ projectId: true });
export type UpdateNoteInput = z.infer<typeof UpdateNoteInput>;

export const ListNotesInput = Pagination.extend({
  projectId: Cuid,
  pinnedOnly: z.boolean().optional(),
  search: z.string().trim().optional(),
  tag: z.string().trim().optional(),
});
export type ListNotesInput = z.infer<typeof ListNotesInput>;
