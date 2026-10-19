import { useEffect, useRef, type RefObject } from "react";

/** Calls `handler` on pointer-down outside `ref` (only while `enabled`). */
export function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void, enabled = true) {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) saved.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") saved.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, enabled]);
}
