"use client";

import { useEffect, type RefObject } from "react";

export function usePassVerticalWheel(
  ref: RefObject<HTMLElement | null>,
  innerScrollSelector?: string
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      if (innerScrollSelector) {
        const inner = (e.target as HTMLElement).closest(innerScrollSelector);
        if (inner instanceof HTMLElement) {
          const max = inner.scrollHeight - inner.clientHeight;
          if (max > 1) {
            const atTop = inner.scrollTop <= 0;
            const atBottom =
              inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1;
            if (e.deltaY < 0 && !atTop) return;
            if (e.deltaY > 0 && !atBottom) return;
          }
        }
      }

      e.preventDefault();
      window.scrollBy({ top: e.deltaY });
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [ref, innerScrollSelector]);
}
