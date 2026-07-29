export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-accent" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  );
}
