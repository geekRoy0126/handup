"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "handup:large-text";
const CHANGE_EVENT = "handup:large-text-change";

// localStorage can throw (private mode, blocked storage): then the toggle still works for this page view.
let fallback = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void): () => void {
  // `storage` fires for changes in other tabs; CHANGE_EVENT for changes in this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Remembers the host's "Large text" choice in this browser. useSyncExternalStore keeps server rendering (false)
 * and the first client render in agreement without setting state in an effect (#63).
 */
export function useLargeText(): [boolean, (value: boolean) => void] {
  const isLarge = useSyncExternalStore(subscribe, read, () => false);
  const update = useCallback((value: boolean) => {
    fallback = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // Storage unavailable: `fallback` carries the choice for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [isLarge, update];
}
