import { Button } from "./button";

type ErrorStateProps = { message: string; onRetry?: () => void };

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 px-5 py-4">
      <p className="flex-1 text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
