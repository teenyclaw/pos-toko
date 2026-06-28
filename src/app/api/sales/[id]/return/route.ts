import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { saleReturnSchema } from "@/lib/validations";
import { convertToBaseUnit, adjustStock } from "@/lib/stock";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const { id } = await params;
  const saleId = parseInt(id, 10);
  const body = await request.json().catch(() => ({}));
  const parsed = saleReturnSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { details: true },
  });

  if (!sale) return apiError("Transaksi tidak ditemukan", 404);
  if (sale.status !== "COMPLETED") return apiError("Transaksi sudah dibatalkan/diretur");

  await prisma.$transaction(async (tx) => {
    for (const item of sale.details) {
      const baseQty = await convertToBaseUnit(item.productId, item.unitId, Number(item.quantity));
      await adjustStock(
        item.productId,
        session.user.id,
        "RETURN",
        baseQty,
        "SALE_RETURN",
        sale.id,
        parsed.data.reason ?? "Retur penjualan",
        tx
      );
    }

    if (sale.paymentMethod === "TEMPO" && sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { balance: { decrement: Number(sale.total) } },
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "CANCELLED",
        notes: parsed.data.reason
          ? `${sale.notes ?? ""}\n[RETUR] ${parsed.data.reason}`.trim()
          : sale.notes,
      },
    });
  });

  return apiSuccess({ message: "Retur penjualan berhasil, stok dikembalikan" });
}
