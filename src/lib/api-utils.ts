import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, hasRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(roles?: UserRole[]) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (roles && !hasRole(session.user.role, roles)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const search = searchParams.get("search") ?? "";
  const skip = (page - 1) * limit;
  return { page, limit, search, skip };
}
