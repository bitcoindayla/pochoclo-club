import type { Metadata } from "next";

import { CompleteSession } from "./complete-session";

export const metadata: Metadata = { title: "Ingreso" };

export default function AuthCompletePage() {
  return <CompleteSession />;
}
