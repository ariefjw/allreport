import { IntradayJobsPage } from "@/components/intraday/IntradayJobsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function IntradayJobsRoute() {
  return (
    <ErrorBoundary>
      <IntradayJobsPage />
    </ErrorBoundary>
  );
}
