import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuestionItem } from "@/lib/client/use-questions";

import { VoteButton } from "./vote-button";

const question: QuestionItem = {
  id: "q1",
  body: "What is RAG?",
  authorName: null,
  status: "OPEN",
  isPinned: false,
  createdAt: "2026-11-12T15:00:00.000Z",
  answeredAt: null,
  votes: 2,
  hasVoted: false,
  isMine: false,
  mergedCount: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoteButton", () => {
  it("is disabled while its vote request is in flight, so a double-tap sends one request (#40)", async () => {
    let finish: (res: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    render(<VoteButton question={question} onVoted={() => {}} />);

    const button = screen.getByRole("button", { name: /Upvote/ });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(Response.json({ data: { voted: true, votes: 3 } }));
    await vi.waitFor(() => expect(button).toBeEnabled());
  });

  it("is disabled on the guest's own question", () => {
    render(<VoteButton question={{ ...question, isMine: true }} onVoted={() => {}} />);
    expect(screen.getByRole("button", { name: /Your question/ })).toBeDisabled();
  });
});
