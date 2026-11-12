import { z } from "zod";

// Emails are compared and stored lowercase so "Alice@Example.com" and "alice@example.com" are one account.
const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." }));

export const registerSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter your name." }).max(80),
  email,
  password: z.string().min(8, { error: "Password must be at least 8 characters." }).max(200),
});
export type Register = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }).max(200),
});
export type Login = z.infer<typeof loginSchema>;
