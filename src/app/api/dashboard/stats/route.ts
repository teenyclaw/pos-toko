import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    todaySalesAgg,
    todayTransactions,
    monthlySalesAgg,
    customerDebtAgg,
    receivablesAgg,
    topProductsRaw,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
    }),
    prisma.sale.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.customer.aggregate({ _sum: { balance: true } }),
    prisma.payment.aggregate({
      where: { type: "RECEIVABLE" },
      _sum: { amount: true },
    }),
    prisma.saleDetail.groupBy({
      by: ["productId"],
      where: { sale: { date: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const productIds = topProductsRaw.map((p) => p.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const salesChart = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      return prisma.sale
        .aggregate({
          where: { date: { gte: dayStart, lte: dayEnd }, status: "COMPLETED" },
          _sum: { total: true },
        })
        .then((agg) => ({
          date: format(date, "dd/MM"),
          total: Number(agg._sum.total ?? 0),
        }));
    })
  );

  const lowStock = await prisma.$queryRaw<
    Array<{ id: number; name: string; stock: number; min_stock: number; abbreviation: string }>
  >`
    SELECT p.id, p.name, p.stock, p.min_stock, u.abbreviation
    FROM products p
    JOIN units u ON p.base_unit_id = u.id
    WHERE p.is_active = 1 AND p.stock <= p.min_stock
    ORDER BY p.stock ASC
    LIMIT 5
  `;

  return apiSuccess({
    todaySales: Number(todaySalesAgg._sum.total ?? 0),
    todayTransactions,
    monthlyRevenue: Number(monthlySalesAgg._sum.total ?? 0),
    customerDebt: Number(customerDebtAgg._sum.balance ?? 0),
    receivables: Number(receivablesAgg._sum.amount ?? 0),
    lowStockProducts: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      stock: Number(p.stock),
      minStock: Number(p.min_stock),
      unit: p.abbreviation,
    })),
    topProducts: topProductsRaw.map((p) => ({
      id: p.productId,
      name: productMap.get(p.productId) ?? "Unknown",
      totalQty: Number(p._sum.quantity ?? 0),
      totalSales: Number(p._sum.total ?? 0),
    })),
    salesChart,
  });
}
