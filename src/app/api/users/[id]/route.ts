import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { userSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER"]);
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const data: {
    name: string;
    email: string;
    role: "OWNER" | "KASIR" | "GUDANG";
    isActive: boolean;
    password?: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: id } },
  });
  if (emailTaken) return apiError("Email sudah digunakan");

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return apiSuccess(user);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER"]);
  if (error || !session) return error;

  const { id } = await params;
  if (id === session.user.id) return apiError("Tidak dapat menghapus akun sendiri");

  const salesCount = await prisma.sale.count({ where: { userId: id } });
  if (salesCount > 0) {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return apiSuccess({ message: "User dinonaktifkan karena memiliki riwayat transaksi" });
  }

  await prisma.user.delete({ where: { id } });
  return apiSuccess({ message: "User dihapus" });
}
