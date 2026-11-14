import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadTextFile } from "./download-file";

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => "blob:handup-test");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("downloadTextFile", () => {
  it("clicks a link with the file name and the object URL", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadTextFile("handup-K7Q2XM-report.md", "# Report", "text/markdown");
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("handup-K7Q2XM-report.md");
    expect(link.href).toBe("blob:handup-test");
  });

  it("revokes the object URL only after the download has started (Firefox and Safari) (#61)", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadTextFile("report.md", "# Report", "text/markdown");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:handup-test");
  });
});
