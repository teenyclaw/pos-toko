import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { unitSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return apiSuccess({ data: units });
}

export async function POST(request: Request) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;
  const body = await request.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);
  const unit = await prisma.unit.create({ data: parsed.data });
  return apiSuccess(unit, 201);
}
