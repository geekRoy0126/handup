import type { Metadata } from "next";

import { ApiKeysView } from "@/components/settings/api-keys-view";

export const metadata: Metadata = { title: "API keys · HandUp" };

export default function ApiKeysPage() {
  return <ApiKeysView />;
}
