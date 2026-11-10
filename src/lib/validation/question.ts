import { z } from "zod";

export const QUESTION_MIN_LENGTH = 3;
export const QUESTION_MAX_LENGTH = 300;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export const askQuestionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(QUESTION_MIN_LENGTH, { error: `Questions need at least ${QUESTION_MIN_LENGTH} characters.` })
    .max(QUESTION_MAX_LENGTH, { error: `Questions can be at most ${QUESTION_MAX_LENGTH} characters.` }),
  // A blank name means "no name" (shown as Anonymous).
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX_LENGTH)
    .optional()
    .transform((name) => (name ? name : undefined)),
  isAnonymous: z.boolean().default(true),
});
export type AskQuestion = Omit<z.infer<typeof askQuestionSchema>, "displayName"> & { displayName?: string };

// Staff actions on one question (PRD §4.3). Hide/unhide are added with moderators in #8.
export const questionActionSchema = z.object({
  action: z.enum(["pin", "unpin", "answer", "reopen"]),
});
