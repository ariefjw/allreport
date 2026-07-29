import type { Metadata } from "next";
import { CriticalJobsPage } from "@/components/critical/CriticalJobsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "Critical Jobs — Job Track Central",
  description: "Monitor critical job status, track end times, and manage batch imports.",
};

export default function CriticalJobsRoute() {
  return (
    <ErrorBoundary>
      <CriticalJobsPage />
    </ErrorBoundary>
  );
}
