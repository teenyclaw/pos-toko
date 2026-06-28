import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { expenseSchema } from "@/lib/validations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const expense = await prisma.expense.update({
    where: { id: parseInt(id, 10) },
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      notes: parsed.data.notes,
    },
  });

  return apiSuccess({ ...expense, amount: Number(expense.amount) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { id } = await params;
  await prisma.expense.delete({ where: { id: parseInt(id, 10) } });
  return apiSuccess({ message: "Beban dihapus" });
}
