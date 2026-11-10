type FormErrorProps = { message: string | null };

/** Form-level error announced to screen readers. Renders nothing when there is no error. */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
