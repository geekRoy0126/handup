type StatusTagProps = { status: "LIVE" | "ENDED" };

/** Status is shown with a word and a dot, never by color alone. */
export function StatusTag({ status }: StatusTagProps) {
  const isLive = status === "LIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        isLive ? "border-status-answered/40 text-status-answered" : "border-line text-status-hidden"
      }`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${isLive ? "bg-status-answered" : "bg-status-hidden"}`} />
      {isLive ? "Live" : "Ended"}
    </span>
  );
}
