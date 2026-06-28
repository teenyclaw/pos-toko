import { NextResponse } from "next/server";

export async function GET() {
  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0225379b-e26a-4e8c-a6a2-2ed4575df9f9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8eb818" },
    body: JSON.stringify({
      sessionId: "8eb818",
      runId: "health",
      hypothesisId: "H2-H3",
      location: "api/health/route.ts:entry",
      message: "health handler entry",
      data: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        nodeEnv: process.env.NODE_ENV ?? "unknown",
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const checks = {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
      database: "unknown" as "ok" | "error" | "skip" | "unknown",
      databaseError: null as string | null,
      prismaClient: "unknown" as "ok" | "error" | "skip" | "unknown",
      prismaError: null as string | null,
    };

    if (checks.hasDatabaseUrl) {
      try {
        const { default: prisma } = await import("@/lib/prisma");
        checks.prismaClient = "ok";
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "ok";
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        if (checks.prismaClient === "unknown") {
          checks.prismaClient = "error";
          checks.prismaError = message;
        } else {
          checks.database = "error";
          checks.databaseError = message;
        }
      }
    } else {
      checks.database = "skip";
      checks.prismaClient = "skip";
    }

    const healthy =
      checks.hasDatabaseUrl &&
      checks.hasNextAuthUrl &&
      checks.hasNextAuthSecret &&
      checks.prismaClient === "ok" &&
      checks.database === "ok";

    // #region agent log
    fetch("http://127.0.0.1:7865/ingest/0225379b-e26a-4e8c-a6a2-2ed4575df9f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8eb818" },
      body: JSON.stringify({
        sessionId: "8eb818",
        runId: "health",
        hypothesisId: "H2-H3",
        location: "api/health/route.ts:result",
        message: "health checks complete",
        data: {
          healthy,
          database: checks.database,
          prismaClient: checks.prismaClient,
          hasNextAuthSecret: checks.hasNextAuthSecret,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ ok: healthy, checks }, { status: healthy ? 200 : 503 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown fatal error";

    // #region agent log
    fetch("http://127.0.0.1:7865/ingest/0225379b-e26a-4e8c-a6a2-2ed4575df9f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8eb818" },
      body: JSON.stringify({
        sessionId: "8eb818",
        runId: "health",
        hypothesisId: "H2-H3",
        location: "api/health/route.ts:fatal",
        message: "health handler fatal",
        data: { error: message },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ ok: false, fatal: message }, { status: 500 });
  }
}
