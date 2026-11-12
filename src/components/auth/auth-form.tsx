"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";

type AuthFormProps = { mode: "login" | "register" };

/** Only allow same-site relative redirects after login (no open redirects). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    const result = await apiFetch(`/api/v1/auth/${mode}`, {
      body: {
        ...(isRegister ? { name: form.get("name") } : {}),
        email: form.get("email"),
        password: form.get("password"),
      },
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {isRegister && <TextField label="Name" name="name" autoComplete="name" required maxLength={80} />}
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        hint={isRegister ? "At least 8 characters." : undefined}
        required
      />
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        {isRegister ? "Create account" : "Log in"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        {isRegister ? "Already have an account? " : "New to HandUp? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-brand-600 underline">
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
