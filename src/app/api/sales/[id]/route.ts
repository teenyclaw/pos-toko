import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { buildReceiptData } from "@/lib/receipt";

function serializeSale(sale: Awaited<ReturnType<typeof fetchSale>>) {
  if (!sale) return null;
  return {
    ...sale,
    subtotal: Number(sale.subtotal),
    itemDiscount: Number(sale.itemDiscount),
    transactionDiscount: Number(sale.transactionDiscount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    paid: Number(sale.paid),
    change: Number(sale.change),
    details: sale.details.map((d) => ({
      ...d,
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      discount: Number(d.discount),
      total: Number(d.total),
    })),
  };
}

async function fetchSale(id: number) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
      details: {
        include: {
          product: { select: { name: true } },
          unit: { select: { abbreviation: true } },
        },
      },
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "KASIR"]);
  if (error) return error;

  const { id } = await params;
  const sale = await fetchSale(parseInt(id, 10));

  if (!sale) return apiError("Transaksi tidak ditemukan", 404);

  const settings = await prisma.storeSetting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const serialized = serializeSale(sale)!;

  return apiSuccess({
    sale: serialized,
    receipt: buildReceiptData(serialized, settingsMap),
  });
}
