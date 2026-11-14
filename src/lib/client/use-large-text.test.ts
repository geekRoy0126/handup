import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useLargeText } from "./use-large-text";

const KEY = "handup:large-text";

afterEach(() => {
  window.localStorage.clear();
});

describe("useLargeText", () => {
  it("starts from the saved choice and saves a new one", () => {
    window.localStorage.setItem(KEY, "1");
    const { result } = renderHook(() => useLargeText());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe("0");
  });

  it("follows a change made in another tab (the storage event) (#63)", () => {
    const { result } = renderHook(() => useLargeText());
    expect(result.current[0]).toBe(false);
    act(() => {
      window.localStorage.setItem(KEY, "1");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: "1" }));
    });
    expect(result.current[0]).toBe(true);
  });
});
