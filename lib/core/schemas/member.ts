import { z } from "zod";
import { Cuid, Email, NonEmptyString } from "./common";

export const RoleEnum = z.enum(["SUPER_ADMIN", "PROJECT_MANAGER", "MEMBER"]);

export const CreateMemberInput = z.object({
  firstName: NonEmptyString.max(80),
  lastName: NonEmptyString.max(80),
  email: Email.optional(),
  phone: z.string().trim().max(40).optional(),
  age: z.number().int().min(15).max(120).optional(),
  slackId: z.string().trim().max(40).optional(),
  role: RoleEnum.default("MEMBER"),
  isBoss: z.boolean().default(false),
});
export type CreateMemberInput = z.infer<typeof CreateMemberInput>;

export const UpdateMemberInput = CreateMemberInput.partial();
export type UpdateMemberInput = z.infer<typeof UpdateMemberInput>;

export const MemberIdInput = z.object({ id: Cuid });
