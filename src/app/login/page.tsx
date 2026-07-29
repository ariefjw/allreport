import { LoginPage } from "@/components/auth/LoginPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function Login() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  );
}
