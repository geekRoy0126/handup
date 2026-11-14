import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionEvents } from "./use-session-events";

/** Minimal EventSource stand-in: tests push server events with `emit`. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent<string>(type, { data: JSON.stringify(data) });
    act(() => this.listeners.get(type)?.forEach((listener) => listener(event)));
  }
}

function latestSource(): FakeEventSource {
  const source = FakeEventSource.instances.at(-1);
  if (!source) throw new Error("no EventSource was opened");
  return source;
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSessionEvents", () => {
  it("refetches once when the stream first opens, to catch changes made before it connected (#45)", () => {
    const onChange = vi.fn();
    renderHook(() => useSessionEvents("K7Q2XM", true, onChange));
    latestSource().emit("ready", { version: 3 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refetches on every 'changed' event", () => {
    const onChange = vi.fn();
    renderHook(() => useSessionEvents("K7Q2XM", true, onChange));
    const source = latestSource();
    source.emit("ready", { version: 3 });
    source.emit("changed", { version: 4 });
    source.emit("changed", { version: 5 });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("does not refetch when a reconnect reports the version it already has", () => {
    const onChange = vi.fn();
    renderHook(() => useSessionEvents("K7Q2XM", true, onChange));
    const source = latestSource();
    source.emit("ready", { version: 3 });
    source.emit("ready", { version: 3 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("opens nothing while disabled and closes the stream on unmount", () => {
    const { rerender, unmount } = renderHook(({ enabled }) => useSessionEvents("K7Q2XM", enabled, () => {}), {
      initialProps: { enabled: false },
    });
    expect(FakeEventSource.instances).toHaveLength(0);
    rerender({ enabled: true });
    expect(latestSource().url).toBe("/api/v1/sessions/K7Q2XM/events");
    unmount();
    expect(latestSource().closed).toBe(true);
  });
});
