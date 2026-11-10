"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";
import { DISPLAY_NAME_MAX_LENGTH, QUESTION_MAX_LENGTH, QUESTION_MIN_LENGTH } from "@/lib/validation/question";

type AskFormProps = { code: string; onAsked: () => void };

export function AskForm({ code, onAsked }: AskFormProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const length = body.trim().length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = new FormData(event.currentTarget).get("displayName");
    setIsSubmitting(true);
    setError(null);
    const result = await apiFetch(`/api/v1/sessions/${code}/questions`, {
      body: { body, isAnonymous, displayName: isAnonymous ? undefined : displayName },
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody("");
    onAsked();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <label htmlFor={`${id}-body`} className="text-sm font-medium">
        Your question
      </label>
      <textarea
        id={`${id}-body`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={QUESTION_MAX_LENGTH}
        rows={3}
        aria-describedby={`${id}-count`}
        className="rounded-lg border border-line bg-surface p-3 text-base focus-visible:outline-2 focus-visible:outline-brand-600"
      />
      <p id={`${id}-count`} className="self-end text-xs text-ink-muted">
        {length}/{QUESTION_MAX_LENGTH}
      </p>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="size-5 accent-brand-600"
        />
        Ask anonymously
      </label>
      {!isAnonymous && (
        <TextField label="Your name (optional)" name="displayName" maxLength={DISPLAY_NAME_MAX_LENGTH} autoComplete="nickname" />
      )}
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting || length < QUESTION_MIN_LENGTH}>
        Ask
      </Button>
    </form>
  );
}
