import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { purchaseReturnSchema } from "@/lib/validations";
import { convertToBaseUnit, adjustStock } from "@/lib/stock";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER", "GUDANG"]);
  if (error || !session) return error;

  const { id } = await params;
  const purchaseId = parseInt(id, 10);
  const body = await request.json().catch(() => ({}));
  const parsed = purchaseReturnSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { details: true },
  });

  if (!purchase) return apiError("Pembelian tidak ditemukan", 404);
  if (purchase.status !== "COMPLETED") return apiError("Pembelian sudah diretur/dibatalkan");

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.details) {
      const baseQty = await convertToBaseUnit(item.productId, item.unitId, Number(item.quantity));
      await adjustStock(
        item.productId,
        session.user.id,
        "RETURN",
        -baseQty,
        "PURCHASE_RETURN",
        purchase.id,
        parsed.data.reason ?? "Retur pembelian",
        tx
      );
    }

    if (purchase.paymentMethod === "TEMPO") {
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { balance: { decrement: Number(purchase.total) } },
      });
    }

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "RETURNED",
        notes: parsed.data.reason
          ? `${purchase.notes ?? ""}\n[RETUR] ${parsed.data.reason}`.trim()
          : purchase.notes,
      },
    });
  });

  return apiSuccess({ message: "Retur pembelian berhasil, stok dikurangi" });
}
