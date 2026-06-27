import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const { id } = await params;
  const held = await prisma.heldSale.findFirst({
    where: { id: parseInt(id, 10), userId: session.user.id },
    include: { customer: { select: { name: true } } },
  });

  if (!held) return apiError("Transaksi ditahan tidak ditemukan", 404);

  return apiSuccess(held);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const { id } = await params;
  const held = await prisma.heldSale.findFirst({
    where: { id: parseInt(id, 10), userId: session.user.id },
  });

  if (!held) return apiError("Transaksi ditahan tidak ditemukan", 404);

  await prisma.heldSale.delete({ where: { id: held.id } });

  return apiSuccess({ message: "Transaksi ditahan dihapus" });
}
