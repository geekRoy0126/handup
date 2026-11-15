import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton (#75)", () => {
  it("is a status with an accessible name, so screen readers announce the loading state", () => {
    render(<Skeleton label="Loading report" className="h-64" />);
    expect(screen.getByRole("status", { name: "Loading report" })).toBeInTheDocument();
  });

  it("also says it in visually hidden text", () => {
    render(<Skeleton label="Loading report" />);
    expect(screen.getByText("Loading report")).toHaveClass("sr-only");
  });

  it("keeps the pulse styling and the size it is given", () => {
    render(<Skeleton label="Loading keys" className="h-32" />);
    expect(screen.getByRole("status", { name: "Loading keys" })).toHaveClass("animate-pulse", "h-32");
  });
});
