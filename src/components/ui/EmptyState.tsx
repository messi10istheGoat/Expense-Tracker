import { SearchX } from "lucide-react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  title?: string;
  message?: string;
  onReset?: () => void;
  className?: string;
}

export function EmptyState({
  title = "Nothing to show",
  message = "No transactions match the current filters.",
  onReset,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("animate-fade-in flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      <div className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <SearchX className="size-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">{message}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
