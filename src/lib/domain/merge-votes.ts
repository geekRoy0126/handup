// Merging duplicates (docs/PRD.md §4.3): each source vote moves to the target, unless that guest already voted
// for the target or wrote it (nobody may vote twice or on their own question). Those votes are dropped.
export type MergeVotesInput = { sourceVoterIds: string[]; targetVoterIds: string[]; targetAuthorId: string };

export function mergeVotes({ sourceVoterIds, targetVoterIds, targetAuthorId }: MergeVotesInput) {
  const alreadyOnTarget = new Set(targetVoterIds);
  const move: string[] = [];
  const drop: string[] = [];
  for (const voterId of sourceVoterIds) {
    if (alreadyOnTarget.has(voterId) || voterId === targetAuthorId) drop.push(voterId);
    else move.push(voterId);
  }
  return { move, drop };
}
