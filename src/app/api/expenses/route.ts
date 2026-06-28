import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, parsePagination } from "@/lib/api-utils";
import { expenseSchema } from "@/lib/validations";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(request: Request) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = from && to
    ? { date: { gte: startOfDay(parseISO(from)), lte: endOfDay(parseISO(to)) } }
    : {};

  const [data, total, sumAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return apiSuccess({
    data: data.map((e) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      date: e.date,
      notes: e.notes,
      userName: e.user.name,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: { totalAmount: Number(sumAgg._sum.amount ?? 0) },
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const expense = await prisma.expense.create({
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      notes: parsed.data.notes,
      userId: session.user.id,
    },
    include: { user: { select: { name: true } } },
  });

  return apiSuccess(
    {
      ...expense,
      amount: Number(expense.amount),
      userName: expense.user.name,
    },
    201
  );
}
