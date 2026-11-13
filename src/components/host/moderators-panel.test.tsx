import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModeratorsPanel } from "./moderators-panel";

const ok = (data: unknown) => Response.json({ data });
const fail = () => Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ModeratorsPanel (#62)", () => {
  it("shows a loading state until the list arrives", async () => {
    let finish: (res: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))));
    render(<ModeratorsPanel code="K7Q2XM" />);
    expect(screen.getByLabelText("Loading moderators")).toBeInTheDocument();
    await act(async () => finish(ok({ moderators: [{ userId: "u1", name: "Terry TA", email: "ta@example.com" }] })));
    expect(screen.queryByLabelText("Loading moderators")).not.toBeInTheDocument();
    expect(screen.getByText("Terry TA")).toBeInTheDocument();
  });

  it("shows an error with Retry when loading fails, and Retry loads again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail())
      .mockResolvedValueOnce(ok({ moderators: [{ userId: "u1", name: "Terry TA", email: "ta@example.com" }] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ModeratorsPanel code="K7Q2XM" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Terry TA")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
