import { z } from "zod";

export const inviteModeratorSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." })),
});
export type InviteModerator = z.infer<typeof inviteModeratorSchema>;
