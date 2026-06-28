import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { saleSchema } from "@/lib/validations";
import { generateInvoice } from "@/lib/utils";
import { convertToBaseUnit, adjustStock } from "@/lib/stock";
import { buildReceiptData } from "@/lib/receipt";
import { startOfDay, endOfDay } from "date-fns";

const saleInclude = {
  customer: { select: { name: true } },
  user: { select: { name: true } },
  details: {
    include: {
      product: { select: { name: true } },
      unit: { select: { abbreviation: true } },
    },
  },
} as const;

function serializeSale<T extends Record<string, unknown>>(sale: T) {
  return {
    ...sale,
    subtotal: Number(sale.subtotal),
    itemDiscount: Number(sale.itemDiscount),
    transactionDiscount: Number(sale.transactionDiscount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    paid: Number(sale.paid),
    change: Number(sale.change),
    details: (sale.details as Array<Record<string, unknown>>).map((d) => ({
      ...d,
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      discount: Number(d.discount),
      total: Number(d.total),
    })),
  };
}

export async function GET(request: Request) {
  const { error } = await requireAuth(["OWNER", "KASIR"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const todayOnly = searchParams.get("today") === "true";

  const sales = await prisma.sale.findMany({
    where: todayOnly
      ? {
          date: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
          status: "COMPLETED",
        }
      : { status: "COMPLETED" },
    take: limit,
    orderBy: { date: "desc" },
    include: saleInclude,
  });

  return apiSuccess({
    data: sales.map((s) => serializeSale(s)),
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const subtotal = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
    0
  );
  const total = subtotal - parsed.data.transactionDiscount + parsed.data.tax;
  const change = parsed.data.paymentMethod === "TEMPO" ? 0 : parsed.data.paid - total;

  if (parsed.data.paymentMethod !== "TEMPO" && parsed.data.paid < total) {
    return apiError("Pembayaran kurang");
  }

  if (parsed.data.paymentMethod === "TEMPO" && parsed.data.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
    if (!customer) return apiError("Pelanggan tidak ditemukan");
    const newBalance = Number(customer.balance) + total;
    if (newBalance > Number(customer.creditLimit) && Number(customer.creditLimit) > 0) {
      return apiError(`Melebihi limit kredit (Rp ${Number(customer.creditLimit).toLocaleString("id-ID")})`);
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const invoiceNumber = generateInvoice("INV");

    const newSale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId: parsed.data.customerId ?? null,
        userId: session.user.id,
        subtotal,
        itemDiscount: parsed.data.items.reduce((s, i) => s + i.discount, 0),
        transactionDiscount: parsed.data.transactionDiscount,
        tax: parsed.data.tax,
        total,
        paid: parsed.data.paymentMethod === "TEMPO" ? 0 : parsed.data.paid,
        change: change > 0 ? change : 0,
        paymentMethod: parsed.data.paymentMethod,
        status: "COMPLETED",
        notes: parsed.data.notes,
        details: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId,
            unitId: item.unitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.quantity * item.unitPrice - item.discount,
          })),
        },
      },
    });

    for (const item of parsed.data.items) {
      const baseQty = await convertToBaseUnit(item.productId, item.unitId, item.quantity);
      await adjustStock(item.productId, session.user.id, "SALE", -baseQty, "SALE", newSale.id, undefined, tx);
    }

    if (parsed.data.paymentMethod === "TEMPO" && parsed.data.customerId) {
      await tx.customer.update({
        where: { id: parsed.data.customerId },
        data: { balance: { increment: total } },
      });
      await tx.payment.create({
        data: {
          type: "RECEIVABLE",
          amount: total,
          method: "TEMPO",
          saleId: newSale.id,
          customerId: parsed.data.customerId,
        },
      });
    }

    return newSale.id;
  });

  const fullSale = await prisma.sale.findUnique({
    where: { id: sale },
    include: saleInclude,
  });

  if (!fullSale) return apiError("Gagal memuat transaksi", 500);

  const settings = await prisma.storeSetting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const serialized = serializeSale(fullSale);

  return apiSuccess(
    {
      ...serialized,
      receipt: buildReceiptData(serialized, settingsMap),
    },
    201
  );
}
