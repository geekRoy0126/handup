"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";

export function CreateSessionForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const title = new FormData(event.currentTarget).get("title");
    const result = await apiFetch<{ session: { code: string } }>("/api/v1/sessions", { body: { title } });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/host/${result.data.session.code}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-end">
      <TextField
        label="Session title"
        name="title"
        placeholder="e.g. CS6983 Lecture 9: Agents"
        required
        minLength={3}
        maxLength={80}
        className="flex-1"
      />
      <Button type="submit" disabled={isSubmitting}>
        Create session
      </Button>
      <div className="sm:basis-full">
        <FormError message={error} />
      </div>
    </form>
  );
}
