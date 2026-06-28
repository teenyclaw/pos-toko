import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const [
    categories,
    units,
    suppliers,
    customers,
    products,
    sales,
    purchases,
    expenses,
    settings,
    users,
  ] = await Promise.all([
    prisma.category.findMany(),
    prisma.unit.findMany(),
    prisma.supplier.findMany(),
    prisma.customer.findMany(),
    prisma.product.findMany({ select: { id: true, code: true, name: true, stock: true, sellPrice: true, buyPrice: true } }),
    prisma.sale.findMany({
      take: 500,
      orderBy: { date: "desc" },
      include: { details: true },
    }),
    prisma.purchase.findMany({
      take: 500,
      orderBy: { date: "desc" },
      include: { details: true },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.storeSetting.findMany(),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    data: {
      categories,
      units,
      suppliers: suppliers.map((s) => ({ ...s, balance: Number(s.balance) })),
      customers: customers.map((c) => ({
        ...c,
        balance: Number(c.balance),
        creditLimit: Number(c.creditLimit),
      })),
      products: products.map((p) => ({
        ...p,
        stock: Number(p.stock),
        sellPrice: Number(p.sellPrice),
        buyPrice: Number(p.buyPrice),
      })),
      sales: sales.map((s) => ({
        ...s,
        subtotal: Number(s.subtotal),
        total: Number(s.total),
        paid: Number(s.paid),
      })),
      purchases: purchases.map((p) => ({
        ...p,
        subtotal: Number(p.subtotal),
        total: Number(p.total),
        paid: Number(p.paid),
      })),
      expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    },
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pos-toko-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
