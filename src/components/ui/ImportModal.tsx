import { useState } from "react";
import { X, Upload } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<void>;
  title: string;
  description: string;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  title,
  description,
}: ImportModalProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onImport(text);
      setText("");
      onClose();
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-lg">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
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
              placeholder="Paste your report here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
            />

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
