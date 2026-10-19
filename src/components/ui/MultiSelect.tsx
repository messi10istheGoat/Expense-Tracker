import { useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

export interface MultiOption<T extends string> {
  value: T;
  label: string;
  color?: string;
  icon?: LucideIcon;
  hint?: string;
  group?: string;
}

interface MultiSelectProps<T extends string> {
  label: string;
  icon: LucideIcon;
  options: MultiOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  quickPicks?: { label: string; values: T[] }[];
  className?: string;
}

const PANEL_WIDTH = 296;

export function MultiSelect<T extends string>({ label, icon: Icon, options, selected, onChange, quickPicks, className }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);

  const toggleOpen = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setAlignRight(rect.left + PANEL_WIDTH > window.innerWidth - 12);
    }
    setOpen((o) => !o);
  };

  const toggleValue = (v: T) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const summary =
    selected.length === 0
      ? `All ${label.toLowerCase()}`
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${selected.length} ${label.toLowerCase()}`;

  const groups: { name: string; items: MultiOption<T>[] }[] = [];
  for (const o of options) {
    const name = o.group ?? "";
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(o);
  }

  const sameSet = (a: T[], b: T[]) => a.length === b.length && a.every((v) => b.includes(v));

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none sm:text-sm",
          selected.length
            ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800",
        )}
      >
        <Icon className="size-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
        {selected.length > 1 && (
          <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">{selected.length}</span>
        )}
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
      <div
        role="listbox"
        aria-multiselectable
        aria-label={label}
        style={{ width: `min(${PANEL_WIDTH}px, calc(100vw - 2rem))` }}
        className={cn(
          "animate-pop absolute top-full z-50 mt-2 origin-top rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50",
          alignRight ? "right-0 origin-top-right" : "left-0 origin-top-left",
        )}
      >
        {quickPicks && quickPicks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-1.5 pb-2.5 dark:border-slate-800">
            {quickPicks.map((q) => {
              const active = sameSet(q.values, selected);
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onChange(active ? [] : q.values)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="thin-scrollbar max-h-72 overflow-y-auto py-1">
          {groups.map((g) => (
            <div key={g.name || "default"}>
              {g.name && (
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">{g.name}</div>
              )}
              {g.items.map((o) => {
                const checked = selected.includes(o.value);
                const OptIcon = o.icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggleValue(o.value)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                        checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600",
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {OptIcon ? (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${o.color}1f`, color: o.color }}>
                        <OptIcon className="size-3.5" />
                      </span>
                    ) : o.color ? (
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-slate-400 tabular-nums dark:text-slate-500">{o.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-slate-100 px-1.5 pt-1.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
