import type { IssueRef, PrRef } from "../../shared/types";

const INFERRED_FROM: Record<IssueRef["source"], string> = {
  orca: "linked in Orca",
  branch: "inferred from the branch name",
  prompt: "inferred from the agent prompt",
};

export function WorktreeLinks({ issues, pr }: { issues: IssueRef[]; pr: PrRef | null }) {
  if (issues.length === 0 && !pr) return null;
  return (
    <div className="links">
      {issues.map((issue) => (
        <a key={issue.number} className="chip" href={issue.url ?? undefined} target="_blank" rel="noreferrer">
          <span className={`chip-kind ${issue.state === "closed" ? "closed" : ""}`}>#{issue.number}</span>
          <span className="chip-text">{issue.title ?? "issue"}</span>
          {issue.source !== "orca" && (
            <span className="chip-src" title={INFERRED_FROM[issue.source]}>
              ?
            </span>
          )}
        </a>
      ))}
      {pr && (
        <a className="chip pr" href={pr.url ?? undefined} target="_blank" rel="noreferrer">
          <span className={`chip-kind pr-${pr.state ?? "unknown"}`}>PR #{pr.number}</span>
          <span className="chip-text">{pr.title ?? pr.state ?? ""}</span>
          {pr.checksStatus && <span className={`checks checks-${pr.checksStatus}`}>{pr.checksStatus}</span>}
        </a>
      )}
    </div>
  );
}
