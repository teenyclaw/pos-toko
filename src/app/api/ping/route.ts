import { NextResponse } from "next/server";

export async function GET() {
  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0225379b-e26a-4e8c-a6a2-2ed4575df9f9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8eb818" },
    body: JSON.stringify({
      sessionId: "8eb818",
      runId: "ping",
      hypothesisId: "H1-H5",
      location: "api/ping/route.ts:GET",
      message: "ping handler reached",
      data: { nodeEnv: process.env.NODE_ENV ?? "unknown" },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({ ok: true, service: "pos-toko", ts: Date.now() });
}
