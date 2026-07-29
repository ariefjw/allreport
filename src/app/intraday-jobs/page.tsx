import type { Metadata } from "next";
import { IntradayJobsPage } from "@/components/intraday/IntradayJobsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "Intraday Jobs — Job Track Central",
  description: "Monitor intraday batch processing, track batch times, and manage imports.",
};

export default function IntradayJobsRoute() {
  return (
    <ErrorBoundary>
      <IntradayJobsPage />
    </ErrorBoundary>
  );
}
