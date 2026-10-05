import type { KeyboardEvent } from "react";

/**
 * Enter/Space handler for an element that opens something on click but is not
 * a <button> (a clickable table row or card). Keys pressed on a button or link
 * inside it are left alone, so they keep doing their own thing.
 */
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}

/** Visible focus for those clickable rows and cards. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500";
