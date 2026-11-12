import type { Metadata } from "next";
import { Suspense } from "react";

import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = { title: "Session report · HandUp" };

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="m-8 h-64 animate-pulse rounded-xl bg-surface-muted" />}>
      <ReportView />
    </Suspense>
  );
}
