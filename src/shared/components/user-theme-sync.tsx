"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function UserThemeSync({ userId }: { userId: string }) {
  const { theme, setTheme } = useTheme();
  const key = `theme_${userId}`;
  const initialized = useRef(false);

  // On mount: load this user's saved theme
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = localStorage.getItem(key);
    if (saved && saved !== theme) setTheme(saved);
  }, [key, theme, setTheme]);

  // On change: save for this user
  useEffect(() => {
    if (!initialized.current || !theme) return;
    localStorage.setItem(key, theme);
  }, [key, theme]);

  return null;
}
