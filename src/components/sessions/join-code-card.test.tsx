import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JoinCodeCard } from "./join-code-card";

function setClipboard(value: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  setClipboard(undefined);
});

async function clickCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Copy join link/ }));
  });
}

describe("JoinCodeCard", () => {
  it("shows the code with a dash after 3 characters", () => {
    render(<JoinCodeCard code="K7Q2XM" />);
    expect(screen.getByText("K7Q-2XM")).toBeInTheDocument();
  });

  it("says 'Link copied' after a successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<JoinCodeCard code="K7Q2XM" />);
    await clickCopy();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/K7Q2XM`);
    expect(screen.getByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  it("does not claim success when the clipboard write is refused (#45)", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    render(<JoinCodeCard code="K7Q2XM" />);
    await clickCopy();
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
    expect(screen.getByText(/Couldn't copy/)).toBeInTheDocument();
  });

  it("does not claim success when the browser has no clipboard API (#45)", async () => {
    setClipboard(undefined);
    render(<JoinCodeCard code="K7Q2XM" />);
    await clickCopy();
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
    expect(screen.getByText(/Couldn't copy/)).toBeInTheDocument();
  });
});
