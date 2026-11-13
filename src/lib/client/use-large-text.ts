"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "handup:large-text";

/** Remembers the host's "Large text" choice in this browser. Storage can be unavailable, so it is optional. */
export function useLargeText(): [boolean, (value: boolean) => void] {
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    try {
      // Reading storage must happen after mount (it does not exist during server rendering).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setIsLarge(true);
    } catch {
      // Private mode or blocked storage: keep the default.
    }
  }, []);

  function update(value: boolean) {
    setIsLarge(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // Ignore: the toggle still works for this page view.
    }
  }

  return [isLarge, update];
}
