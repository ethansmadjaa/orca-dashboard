import { useState } from "react";
import { focusTerminal, sendToTerminal } from "../lib/api";

/** Types text into a terminal (followed by Enter) or focuses it in the Orca app. */
export function SendForm({ handle }: { handle: string | null }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Remember which terminal an error belongs to, so it disappears when switching terminals.
  const [failure, setFailure] = useState<{ handle: string; message: string } | null>(null);
  const error = failure?.handle === handle ? failure.message : null;

  const send = async () => {
    if (!handle || !text.trim()) return;
    setSending(true);
    const res = await sendToTerminal(handle, text);
    setSending(false);
    if (res.ok) setText("");
    setFailure(res.ok ? null : { handle, message: res.error });
  };

  const focus = async () => {
    if (!handle) return;
    const res = await focusTerminal(handle);
    setFailure(res.ok ? null : { handle, message: res.error });
  };

  return (
    <>
      {error && <div className="error small">{error}</div>}
      <form
        className="send"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={handle ? "Send to terminal (Enter)" : "Pick a terminal"}
          aria-label="Text to send"
          disabled={!handle || sending}
        />
        <button type="submit" disabled={!handle || sending || !text.trim()}>
          Send
        </button>
        <button type="button" className="ghost" disabled={!handle} onClick={() => void focus()}>
          Open in Orca
        </button>
      </form>
    </>
  );
}
