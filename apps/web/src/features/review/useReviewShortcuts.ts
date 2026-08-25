"use client";

import { useEffect } from "react";

import type { Rating } from "./ratings";
import { GRADES } from "./ratings";

type ReviewShortcutsOptions = {
  /** Shortcuts only apply while a card is on screen. */
  enabled: boolean;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (rating: Rating) => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

/**
 * Session keyboard shortcuts: Space reveals the answer, number keys grade
 * (1 = first entry of GRADES, and so on).
 */
export function useReviewShortcuts({
  enabled,
  revealed,
  onReveal,
  onGrade,
}: ReviewShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault(); // keep the page from scrolling
        onReveal();
        return;
      }

      if (!revealed) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < GRADES.length) {
        event.preventDefault();
        onGrade(GRADES[index].value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, revealed, onReveal, onGrade]);
}
