#!/usr/bin/env node
// Sets up the GitHub Scrum workflow for HandUp from docs/PRD.md §5 (single source of truth):
// labels, milestones "Sprint 1" / "Sprint 2", one issue per story (numbers must match the PRD's [#n]),
// a Project board, repo merge settings, and (with --protect) branch protection on main.
//
// Usage (repo root, after `gh auth login` and `gh auth refresh -s project`):
//   node scripts/setup-github.mjs --dry-run
//   node scripts/setup-github.mjs --partner <qingyu-github-login>
//   node scripts/setup-github.mjs --protect          # after main is pushed and CI ran once
// Run it from the account that OWNS the repo, BEFORE the first pull request (issues and PRs share numbers).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const PROTECT = args.includes("--protect");
const partnerIndex = args.indexOf("--partner");
const partner = partnerIndex >= 0 ? (args[partnerIndex + 1] ?? "") : "";

const SPRINTS = {
  "Sprint 1": { due: "2026-11-11T23:59:00Z", description: "Nov 10 – Nov 11. Goal: one full question loop works live (auth, sessions, ask, upvote, pin/answer) and deploys per PR." },
  "Sprint 2": { due: "2026-11-13T23:59:00Z", description: "Nov 12 – Nov 13 (project due). Goal: moderation, merge, live polls, report, public API + docs, polish." },
};
const OWNER_LOGINS = { Ruoyu: "geekRoy0126", Qingyu: partner };

function gh(argv, { input, allowFail = false } = {}) {
  if (DRY) {
    console.log("[dry-run] gh " + argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" "));
    return "";
  }
  try {
    return execFileSync("gh", argv, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    if (allowFail) return "";
    console.error(`gh ${argv.join(" ")} failed:\n${err.stderr || err.message}`);
    process.exit(1);
  }
}

// ---------- Parse docs/PRD.md §5 ----------
function parseStories() {
  const lines = readFileSync(new URL("../docs/PRD.md", import.meta.url), "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("## 5."));
  const stories = [];
  let sprint = "";
  let current = null;
  for (const line of lines.slice(start)) {
    const sprintMatch = line.match(/^### (Sprint \d+)/);
    if (sprintMatch) sprint = sprintMatch[1];
    const head = line.match(/^\*\*\[#(\d+)\] (.+?)\*\* · (\w+) · (\d+) pts · (\w+)/);
    if (head) {
      current = { number: Number(head[1]), title: head[2], type: head[3], points: Number(head[4]), owner: head[5], sprint, story: [], ac: [] };
      stories.push(current);
      continue;
    }
    if (!current || line.trim() === "") { current = line.trim() === "" ? null : current; continue; }
    if (line.startsWith("- [ ]")) current.ac.push(line.slice(6).trim());
    else if (/^\s{2,}\S/.test(line) && current.ac.length) current.ac[current.ac.length - 1] += " " + line.trim();
    else current.story.push(line.trim());
  }
  return stories;
}

function issueBody(s) {
  return [
    s.story.length ? `**User story:** ${s.story.join(" ")}` : "",
    `**Estimate:** ${s.points} points · **Owner:** ${s.owner} (the other partner reviews) · **Source:** docs/PRD.md §5 [#${s.number}]`,
    "",
    "### Acceptance criteria",
    ...s.ac.map((a) => `- [ ] ${a}`),
    "",
    "### Notes for the implementer (human or AI)",
    "- Follow AGENTS.md §0 and the TDD order in §3.4 (failing `test(#n)` commit first).",
    `- Branch: \`${s.type === "feature" ? "feature" : s.type}/${s.number}-<short-summary>\``,
  ].filter((l, i) => l !== "" || i > 0).join("\n");
}

// ---------- Run ----------
const stories = parseStories();
if (stories.length < 10) { console.error(`Parsed only ${stories.length} stories from docs/PRD.md — aborting.`); process.exit(1); }
const repo = DRY ? "owner/handup" : gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
const owner = repo.split("/")[0];
console.log(`Repo ${repo} · ${stories.length} stories · dry run: ${DRY}`);

if (PROTECT) {
  // Require partner review + green CI before merging to main.
  const protection = {
    required_status_checks: { strict: true, contexts: ["Lint and typecheck", "Unit tests", "Integration tests", "Build", "E2E (Playwright)"] },
    enforce_admins: false,
    required_pull_request_reviews: { required_approving_review_count: 1, dismiss_stale_reviews: true },
    restrictions: null,
  };
  gh(["api", "-X", "PUT", `repos/${repo}/branches/main/protection`, "--input", "-"], { input: JSON.stringify(protection) });
  console.log("branch protection on main: 1 approval + 5 CI checks");
  process.exit(0);
}

// Repo settings: no squash merges (would erase failing-test commits), auto-delete merged branches.
gh(["api", "-X", "PATCH", `repos/${repo}`, "-F", "allow_squash_merge=false", "-F", "allow_merge_commit=true", "-F", "allow_rebase_merge=true", "-F", "delete_branch_on_merge=true"]);
if (partner) gh(["api", "-X", "PUT", `repos/${repo}/collaborators/${partner}`, "-f", "permission=push"], { allowFail: true });

const labels = [
  ["feature", "1d76db", "User-facing capability"], ["chore", "c5def5", "Tooling, CI, setup"], ["docs", "0075ca", "Documentation"],
  ["bug", "d73a4a", "Something is broken"],
  ["points:1", "ededed", "Estimate: < 2 h"], ["points:2", "d4e5f7", "Estimate: half a day"], ["points:3", "bfdadc", "Estimate: a day"], ["points:5", "5319e7", "Estimate: two days"],
  ["owner:ruoyu", "fbca04", "Implemented by Ruoyu, reviewed by Qingyu"], ["owner:qingyu", "0e8a16", "Implemented by Qingyu, reviewed by Ruoyu"],
];
for (const [name, color, description] of labels) gh(["label", "create", name, "--repo", repo, "--color", color, "--description", description, "--force"]);
console.log(`labels: ${labels.length}`);

const existingMilestones = DRY ? [] : JSON.parse(gh(["api", `repos/${repo}/milestones?state=all&per_page=100`]) || "[]").map((m) => m.title);
for (const [title, m] of Object.entries(SPRINTS)) {
  if (existingMilestones.includes(title)) { console.log(`milestone exists: ${title}`); continue; }
  gh(["api", `repos/${repo}/milestones`, "-f", `title=${title}`, "-f", `due_on=${m.due}`, "-f", `description=${m.description}`]);
  console.log(`milestone: ${title}`);
}

const existingIssues = DRY ? [] : JSON.parse(gh(["issue", "list", "--repo", repo, "--state", "all", "--limit", "200", "--json", "number,title"]) || "[]");
let projectNumber = "";
if (!DRY) {
  projectNumber = gh(["project", "list", "--owner", owner, "--format", "json", "--jq", '.projects[] | select(.title == "HandUp Board") | .number'], { allowFail: true });
  if (!projectNumber) projectNumber = gh(["project", "create", "--owner", owner, "--title", "HandUp Board", "--format", "json", "--jq", ".number"], { allowFail: true });
  if (projectNumber) gh(["project", "link", projectNumber, "--owner", owner, "--repo", repo], { allowFail: true });
}

for (const s of stories) {
  const found = existingIssues.find((i) => i.number === s.number);
  if (found) { console.log(`issue #${s.number} exists: ${found.title}`); continue; }
  const argv = ["issue", "create", "--repo", repo, "--title", s.title, "--body", issueBody(s), "--milestone", s.sprint,
    "--label", `${s.type},points:${s.points},owner:${s.owner.toLowerCase()}`];
  const login = OWNER_LOGINS[s.owner];
  if (login) argv.push("--assignee", login);
  const url = gh(argv);
  const number = DRY ? s.number : Number(url.split("/").pop());
  if (number !== s.number) {
    console.error(`Created ${url} but PRD expects #${s.number}. The repo already had issues or PRs. Fix docs/PRD.md numbers or use a fresh repo.`);
    process.exit(1);
  }
  if (projectNumber) gh(["project", "item-add", projectNumber, "--owner", owner, "--url", url], { allowFail: true });
  console.log(`issue #${number}: ${s.title} (${s.sprint}, ${s.points} pts, ${s.owner})`);
}

console.log(`\nDone. Next: open the "HandUp Board" project, switch to Board view, add columns
Backlog / Sprint Todo / In Progress / In Review / Done, and move Sprint 1 issues to Sprint Todo.
After the first CI run on main: node scripts/setup-github.mjs --protect`);
