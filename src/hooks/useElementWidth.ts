"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Width of an element, kept in sync with the viewport via `ResizeObserver`.
 *
 * The analytics charts are plain SVG, so they need a real pixel width to lay
 * out their axes: a fixed `viewBox` stretched with `preserveAspectRatio="none"`
 * would scale the stroke widths and turn point markers into ellipses. The
 * fallback is only what the first paint (and the server render) uses — the
 * observer corrects it on the client before anything is visible.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      // Sub-pixel jitter would re-render on every scroll frame otherwise.
      setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
