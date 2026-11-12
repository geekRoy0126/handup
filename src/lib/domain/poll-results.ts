// Poll results (docs/PRD.md §4.4): counts per option and whole-number percentages that add up to exactly 100
// (largest-remainder method; ties go to the earlier option). No responses → 0% everywhere.
export const CONFIDENCE_OPTIONS = ["1 – Lost", "2", "3 – Getting there", "4", "5 – Got it"] as const;

export type PollOptionInput = { id: string; label: string; position: number };
export type OptionResult = { optionId: string; label: string; count: number; percent: number };
export type PollResults = { total: number; options: OptionResult[] };

export function computePollResults(options: PollOptionInput[], responses: { optionId: string }[]): PollResults {
  const ordered = [...options].sort((a, b) => a.position - b.position);
  const counts = new Map(ordered.map((o) => [o.id, 0]));
  for (const r of responses) {
    const current = counts.get(r.optionId);
    if (current !== undefined) counts.set(r.optionId, current + 1);
  }
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

  const rows = ordered.map((o, index) => {
    const count = counts.get(o.id) ?? 0;
    const exact = total === 0 ? 0 : (count * 100) / total;
    return { index, optionId: o.id, label: o.label, count, percent: Math.floor(exact), remainder: exact % 1 };
  });

  if (total > 0) {
    let leftover = 100 - rows.reduce((sum, r) => sum + r.percent, 0);
    const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const row of byRemainder) {
      if (leftover <= 0) break;
      row.percent += 1;
      leftover -= 1;
    }
  }

  return { total, options: rows.map(({ optionId, label, count, percent }) => ({ optionId, label, count, percent })) };
}
