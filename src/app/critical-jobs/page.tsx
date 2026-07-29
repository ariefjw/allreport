import { CriticalJobsPage } from "@/components/critical/CriticalJobsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function CriticalJobsRoute() {
  return (
    <ErrorBoundary>
      <CriticalJobsPage />
    </ErrorBoundary>
  );
}
