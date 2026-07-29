import type { Metadata } from "next";
import { ErrorLogsPage } from "@/components/error/ErrorLogsPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "Error Logs — Job Track Central",
  description: "Document and track operational errors with screenshots.",
};

export default function ErrorLogsRoute() {
  return (
    <ErrorBoundary>
      <ErrorLogsPage />
    </ErrorBoundary>
  );
}
