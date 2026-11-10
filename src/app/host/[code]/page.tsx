import type { Metadata } from "next";
import { Suspense } from "react";

import { HostConsole } from "@/components/host/host-console";

export const metadata: Metadata = { title: "Host console · HandUp" };

export default function HostPage() {
  return (
    <Suspense fallback={<div className="m-8 h-48 animate-pulse rounded-xl bg-surface-muted" />}>
      <HostConsole />
    </Suspense>
  );
}
