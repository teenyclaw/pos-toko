import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const checks = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    database: "unknown" as "ok" | "error" | "unknown",
    databaseError: null as string | null,
  };

  if (checks.hasDatabaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch (err) {
      checks.database = "error";
      checks.databaseError = err instanceof Error ? err.message : "unknown db error";
    }
  }

  const healthy =
    checks.hasDatabaseUrl &&
    checks.hasNextAuthUrl &&
    checks.hasNextAuthSecret &&
    checks.database === "ok";

  return NextResponse.json(
    { ok: healthy, checks },
    { status: healthy ? 200 : 503 }
  );
}
