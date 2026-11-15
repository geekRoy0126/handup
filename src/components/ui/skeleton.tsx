type SkeletonProps = { label: string; className?: string };

/**
 * Loading placeholder. `role="status"` gives the label a place to live (aria-label on a plain div is not allowed and
 * screen readers ignore it, #75); the hidden text is read out as the status.
 */
export function Skeleton({ label, className = "" }: SkeletonProps) {
  return (
    <div role="status" aria-label={label} className={`animate-pulse rounded-xl bg-surface-muted ${className}`}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
