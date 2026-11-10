import type { Metadata } from "next";
import { Suspense } from "react";

import { GuestBoard } from "@/components/guest/guest-board";

export const metadata: Metadata = { title: "Join · HandUp" };

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="m-4 h-48 animate-pulse rounded-xl bg-surface-muted" />}>
      <GuestBoard />
    </Suspense>
  );
}
