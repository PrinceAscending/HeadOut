"use client";

import type { LanyardData } from "@/types";
import { useWorld } from "@/lib/world/store";

/* ═══════════════════════════════════════════════════════════
   Lanyard — public Discord presence relay.
   REST + WebSocket, no token, no private data. Falls back
   gracefully if the relay is unreachable.
   ═══════════════════════════════════════════════════════════ */

const LANYARD_ID = "971329961313046578";
const REST_URL = `https://api.lanyard.rest/v1/users/${LANYARD_ID}`;
const WS_URL = "wss://api.lanyard.rest/socket";

export interface LanyardHandle {
  close: () => void;
}

export function connectLanyard(onFirstData?: (d: LanyardData) => void): LanyardHandle {
  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let retries = 0;
  let closed = false;
  let gotData = false;

  const setHealth = useWorld.getState().setHealth;

  const startHeartbeat = (ms: number) => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
    }, ms);
  };

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      fallbackRest();
      return;
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        switch (msg.op) {
          case 1: {
            startHeartbeat(msg.d.heartbeat_interval);
            ws?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: LANYARD_ID } }));
            break;
          }
          case 0: {
            if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
              const d = msg.d as LanyardData;
              useWorld.getState().setLanyard(d);
              setHealth("discord", { state: "live", lastSync: Date.now() });
              retries = 0;
              if (!gotData) {
                gotData = true;
                onFirstData?.(d);
              }
            }
            break;
          }
        }
      } catch {
        /* malformed frame — ignore */
      }
    };

    ws.onerror = () => {
      setHealth("discord", { state: "degraded" });
    };

    ws.onclose = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (!closed) {
        retries += 1;
        if (retries <= 2) {
          setTimeout(connect, 1500 * retries);
        } else {
          fallbackRest();
        }
      }
    };
  };

  const fallbackRest = async () => {
    if (closed) return;
    try {
      const res = await fetch(REST_URL, { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (json.success) {
        const d = json.data as LanyardData;
        useWorld.getState().setLanyard(d);
        setHealth("discord", { state: "live", lastSync: Date.now() });
        if (!gotData) {
          gotData = true;
          onFirstData?.(d);
        }
        /* keep polling at low frequency as long as WS is down */
        setTimeout(fallbackRest, 45_000);
      } else {
        setHealth("discord", { state: "offline", detail: "not subscribed" });
      }
    } catch {
      setHealth("discord", { state: "offline" });
    }
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      ws?.close();
    },
  };
}
