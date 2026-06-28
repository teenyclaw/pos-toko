import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, parsePagination } from "@/lib/api-utils";
import { purchaseSchema } from "@/lib/validations";
import { generateInvoice } from "@/lib/utils";
import { convertToBaseUnit, adjustStock } from "@/lib/stock";

export async function GET(request: Request) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true } },
        _count: { select: { details: true } },
      },
    }),
    prisma.purchase.count(),
  ]);

  return apiSuccess({
    data: data.map((p) => ({
      ...p,
      subtotal: Number(p.subtotal),
      discount: Number(p.discount),
      tax: Number(p.tax),
      total: Number(p.total),
      paid: Number(p.paid),
      status: p.status,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "GUDANG"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const subtotal = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const total = subtotal - parsed.data.discount + parsed.data.tax;
  const paid = parsed.data.paymentMethod === "TEMPO" ? 0 : (parsed.data.paid || total);

  const purchaseId = await prisma.$transaction(async (tx) => {
    const invoiceNumber = generateInvoice("PO");

    const purchase = await tx.purchase.create({
      data: {
        invoiceNumber,
        supplierId: parsed.data.supplierId,
        userId: session.user.id,
        subtotal,
        discount: parsed.data.discount,
        tax: parsed.data.tax,
        total,
        paid,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes,
        details: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId,
            unitId: item.unitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    for (const item of parsed.data.items) {
      const baseQty = await convertToBaseUnit(item.productId, item.unitId, item.quantity);
      await adjustStock(
        item.productId,
        session.user.id,
        "PURCHASE",
        baseQty,
        "PURCHASE",
        purchase.id,
        `Pembelian ${invoiceNumber}`,
        tx
      );

      await tx.product.update({
        where: { id: item.productId },
        data: { buyPrice: item.unitPrice },
      });
    }

    if (parsed.data.paymentMethod === "TEMPO") {
      await tx.supplier.update({
        where: { id: parsed.data.supplierId },
        data: { balance: { increment: total } },
      });
      await tx.payment.create({
        data: {
          type: "PAYABLE",
          amount: total,
          method: "TEMPO",
          purchaseId: purchase.id,
          supplierId: parsed.data.supplierId,
        },
      });
    }

    return purchase.id;
  });

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      supplier: true,
      user: { select: { name: true } },
      details: { include: { product: true, unit: true } },
    },
  });

  return apiSuccess(
    {
      ...purchase,
      subtotal: Number(purchase!.subtotal),
      discount: Number(purchase!.discount),
      tax: Number(purchase!.tax),
      total: Number(purchase!.total),
    },
    201
  );
}
