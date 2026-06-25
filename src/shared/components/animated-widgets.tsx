import React from "react";

/**
 * Staggered entrance for dashboard widgets.
 *
 * Pure CSS animation (see `.widget-enter` in globals.css) — no JS animation
 * library. This is a Server Component, so it ships zero client JS and adds no
 * hydration cost; the stagger is driven by an inline `animation-delay` per item.
 * Mirrors the previous framer-motion effect (fade + 18px slide-up,
 * cubic-bezier(0.23, 1, 0.32, 1), 0.4s, 0.07s stagger).
 */
export function AnimatedWidgets({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <div key={i} className="widget-enter" style={{ animationDelay: `${i * 0.07}s` }}>
          {child}
        </div>
      ))}
    </>
  );
}
