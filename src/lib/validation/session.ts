import { z } from "zod";

export const createSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Title must be at least 3 characters." })
    .max(80, { error: "Title must be at most 80 characters." }),
});
export type CreateSession = z.infer<typeof createSessionSchema>;
