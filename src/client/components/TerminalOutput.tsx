import { useEffect, useRef } from "react";
import { stripAnsi } from "../lib/format";
import { useTerminalTail } from "../hooks/useTerminalTail";

// Within this many pixels of the bottom, new output keeps the view pinned to the end.
const STICK_THRESHOLD_PX = 40;

/** Live tail of one terminal. Render with `key={handle}`. */
export function TerminalOutput({ handle }: { handle: string }) {
  const { tail, error } = useTerminalTail(handle);
  const preRef = useRef<HTMLPreElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = preRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [tail]);

  return (
    <>
      <pre
        ref={preRef}
        className="term"
        aria-label="Terminal output"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
        }}
      >
        {tail ? tail.lines.map(stripAnsi).join("\n") : "loading…"}
      </pre>
      {error && <div className="error small">{error}</div>}
    </>
  );
}
