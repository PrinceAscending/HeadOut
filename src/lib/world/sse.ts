/* ═══════════════════════════════════════════════════════════
   Shared SSE frame reader for /api/oracle streams.
   Yields content deltas; consumers own their rendering.
   ═══════════════════════════════════════════════════════════ */

export async function* streamOracleDeltas(
  res: Response
): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        /* partial frame */
      }
    }
  }
}
