import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(request: Request) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFrom = from ? startOfDay(parseISO(from)) : startOfDay(new Date());
  const dateTo = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

  if (type === "low-stock") {
    const products = await prisma.$queryRaw<
      Array<{ id: number; code: string; name: string; stock: number; min_stock: number; abbreviation: string }>
    >`
      SELECT p.id, p.code, p.name, p.stock, p.min_stock, u.abbreviation
      FROM products p
      JOIN units u ON p.base_unit_id = u.id
      WHERE p.is_active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `;
    return apiSuccess({
      data: products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        stock: Number(p.stock),
        minStock: Number(p.min_stock),
        unit: p.abbreviation,
      })),
    });
  }

  if (type === "purchases") {
    const purchases = await prisma.purchase.findMany({
      where: { date: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" },
      include: { supplier: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    return apiSuccess({
      data: purchases.map((p) => ({
        invoiceNumber: p.invoiceNumber,
        date: p.date,
        supplier: p.supplier.name,
        total: Number(p.total),
      })),
      summary: {
        totalPurchases: purchases.reduce((s, p) => s + Number(p.total), 0),
        count: purchases.length,
      },
    });
  }

  if (type === "best-sellers") {
    const items = await prisma.saleDetail.groupBy({
      by: ["productId"],
      where: { sale: { date: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 20,
    });
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });
    const map = new Map(products.map((p) => [p.id, p.name]));
    return apiSuccess({
      data: items.map((i) => ({
        name: map.get(i.productId) ?? "-",
        qty: Number(i._sum.quantity ?? 0),
        total: Number(i._sum.total ?? 0),
      })),
    });
  }

  const sales = await prisma.sale.findMany({
    where: { date: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
  const totalTax = sales.reduce((s, sale) => s + Number(sale.tax), 0);

  return apiSuccess({
    data: sales.map((s) => ({
      invoiceNumber: s.invoiceNumber,
      date: s.date,
      customer: s.customer?.name ?? "Umum",
      cashier: s.user.name,
      paymentMethod: s.paymentMethod,
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      total: Number(s.total),
    })),
    summary: {
      totalRevenue,
      totalTax,
      totalTransactions: sales.length,
      dateFrom,
      dateTo,
    },
  });
}
