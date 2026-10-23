import type { AgentView } from "../../shared/types";
import { plural, timeAgo } from "../lib/format";
import { tone } from "../lib/status";
import { StatusPill } from "./StatusPill";

type Props = { agent: AgentView; now: number; onOpen: () => void };

export function AgentRow({ agent, now, onOpen }: Props) {
  const t = tone(agent.state);
  const activeSubagents = agent.subagents.filter((s) => tone(s.state) === "work");

  return (
    <button type="button" className="agent" onClick={onOpen}>
      <div className="agent-head">
        <span className={`dot tone-${t}`} />
        <span className="agent-type">{agent.agentType}</span>
        <StatusPill state={agent.state} />
        {t === "work" && agent.toolName && <span className="tool">{agent.toolName}</span>}
        <span className="muted right">{timeAgo(agent.updatedAt ?? agent.stateStartedAt, now)}</span>
      </div>
      {agent.title && <div className="agent-title">{agent.title}</div>}
      {agent.lastMessage && <div className="agent-msg">{agent.lastMessage}</div>}
      {agent.subagents.length > 0 && (
        <div className="subs">
          {plural(agent.subagents.length, "subagent")}
          {activeSubagents.length > 0 && ` · ${activeSubagents.length} active`}
          {activeSubagents
            .filter((s) => s.description)
            .map((s) => (
              <span key={s.id} className="sub">
                {s.description}
              </span>
            ))}
        </div>
      )}
    </button>
  );
}
