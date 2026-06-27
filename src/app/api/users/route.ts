import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { userSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return apiSuccess({ data: users });
}

export async function POST(request: Request) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);
  if (!parsed.data.password) return apiError("Password wajib diisi");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return apiError("Email sudah digunakan");

  const password = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return apiSuccess(user, 201);
}
