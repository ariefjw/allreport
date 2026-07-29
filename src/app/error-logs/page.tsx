import { ErrorLogsPage } from "@/components/error/ErrorLogsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function ErrorLogsRoute() {
  return (
    <ErrorBoundary>
      <ErrorLogsPage />
    </ErrorBoundary>
  );
}
