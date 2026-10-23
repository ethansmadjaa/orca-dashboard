import { useEffect, useState } from "react";
import type { Snapshot } from "../../shared/types";

/** Live snapshot pushed by the server over SSE. EventSource reconnects on its own after errors. */
export function useSnapshot(url = "/api/stream") {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(url);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e: MessageEvent<string>) => {
      setConnected(true);
      setSnapshot(JSON.parse(e.data) as Snapshot);
    };
    return () => source.close();
  }, [url]);

  return { snapshot, connected };
}
