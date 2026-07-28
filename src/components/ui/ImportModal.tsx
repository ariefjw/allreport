import { useState } from "react";
import { X, Upload } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<void>;
  title: string;
  description: string;
  placeholder?: string;
  error?: string | null;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  title,
  description,
  placeholder = "Paste your report here...",
  error: externalError,
}: ImportModalProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const error = externalError ?? localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setLocalError(null);
    try {
      await onImport(text);
      setText("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-lg">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-ghost p-1.5"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            <textarea
              className="input h-64 resize-none font-mono text-sm"
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
            />

            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !text.trim()}
                className="btn-primary"
              >
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                {isSubmitting ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
