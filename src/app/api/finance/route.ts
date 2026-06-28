import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const [customers, suppliers, recentPayments] = await Promise.all([
    prisma.customer.findMany({
      where: { balance: { gt: 0 } },
      orderBy: { balance: "desc" },
      select: {
        id: true,
        name: true,
        whatsapp: true,
        balance: true,
        creditLimit: true,
      },
    }),
    prisma.supplier.findMany({
      where: { balance: { gt: 0 }, isActive: true },
      orderBy: { balance: "desc" },
      select: { id: true, name: true, contact: true, balance: true },
    }),
    prisma.payment.findMany({
      take: 20,
      orderBy: { date: "desc" },
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
  ]);

  const totalReceivables = customers.reduce((s, c) => s + Number(c.balance), 0);
  const totalPayables = suppliers.reduce((s, s2) => s + Number(s2.balance), 0);

  return apiSuccess({
    receivables: customers.map((c) => ({
      ...c,
      balance: Number(c.balance),
      creditLimit: Number(c.creditLimit),
    })),
    payables: suppliers.map((s) => ({ ...s, balance: Number(s.balance) })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      type: p.type,
      amount: Number(p.amount),
      method: p.method,
      date: p.date,
      notes: p.notes,
      party: p.customer?.name ?? p.supplier?.name ?? "-",
    })),
    summary: { totalReceivables, totalPayables },
  });
}
