import { describe, expect, it } from "vitest";

import { CONFIDENCE_OPTIONS, computePollResults } from "./poll-results";

const options = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Option ${i}`, position: i }));
const answers = (...optionIds: string[]) => optionIds.map((optionId) => ({ optionId }));
const percents = (r: ReturnType<typeof computePollResults>) => r.options.map((o) => o.percent);

describe("computePollResults (PRD §4.4)", () => {
  it("counts responses per option in option order", () => {
    const r = computePollResults(options(3), answers("o1", "o1", "o2"));
    expect(r.total).toBe(3);
    expect(r.options.map((o) => o.count)).toEqual([0, 2, 1]);
  });

  it("shows 0% everywhere when nobody answered", () => {
    expect(percents(computePollResults(options(3), []))).toEqual([0, 0, 0]);
  });

  it("rounds with the largest remainder so percentages add up to exactly 100", () => {
    expect(percents(computePollResults(options(3), answers("o0", "o1", "o2")))).toEqual([34, 33, 33]);
    const seven = computePollResults(options(7), answers("o0", "o1", "o2", "o3", "o4", "o5", "o6"));
    expect(percents(seven).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("keeps exact percentages unchanged", () => {
    expect(percents(computePollResults(options(3), answers("o0", "o0", "o1", "o2")))).toEqual([50, 25, 25]);
  });

  it("gives leftover points to the earlier option when remainders tie", () => {
    expect(percents(computePollResults(options(3), answers("o1", "o2", "o0")))).toEqual([34, 33, 33]);
  });

  it("ignores responses for unknown options", () => {
    expect(computePollResults(options(2), answers("o0", "nope")).total).toBe(1);
  });
});

describe("CONFIDENCE_OPTIONS", () => {
  it("is the fixed 1–5 scale from the PRD", () => {
    expect(CONFIDENCE_OPTIONS).toEqual(["1 – Lost", "2", "3 – Getting there", "4", "5 – Got it"]);
  });
});
