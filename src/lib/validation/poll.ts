import { z } from "zod";

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;

const prompt = z
  .string()
  .trim()
  .min(3, { error: "The poll question needs at least 3 characters." })
  .max(200, { error: "The poll question can be at most 200 characters." });

export const createPollSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("MULTIPLE_CHOICE"),
    prompt,
    options: z
      .array(z.string().trim().min(1, { error: "Options can't be empty." }).max(80))
      .min(POLL_MIN_OPTIONS, { error: `Add at least ${POLL_MIN_OPTIONS} options.` })
      .max(POLL_MAX_OPTIONS, { error: `Use at most ${POLL_MAX_OPTIONS} options.` }),
  }),
  z.object({ kind: z.literal("CONFIDENCE"), prompt }),
]);
export type CreatePoll = z.infer<typeof createPollSchema>;

export const pollResponseSchema = z.object({ optionId: z.string().min(1) });
