import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validations";

function serializeCustomer<T extends { creditLimit: unknown; balance: unknown }>(customer: T) {
  return {
    ...customer,
    creditLimit: Number(customer.creditLimit),
    balance: Number(customer.balance),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id, 10);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: { select: { sales: true } },
      sales: {
        take: 20,
        orderBy: { date: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          total: true,
          paymentMethod: true,
          status: true,
        },
      },
    },
  });

  if (!customer) return apiError("Pelanggan tidak ditemukan", 404);

  return apiSuccess({
    ...serializeCustomer(customer),
    sales: customer.sales.map((s) => ({ ...s, total: Number(s.total) })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "KASIR"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const customer = await prisma.customer.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: parsed.data.name,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      creditLimit: parsed.data.creditLimit,
      ...(parsed.data.points !== undefined && { points: parsed.data.points }),
    },
  });

  return apiSuccess(serializeCustomer(customer));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id, 10);

  const salesCount = await prisma.sale.count({ where: { customerId } });
  if (salesCount > 0) {
    return apiError("Pelanggan tidak dapat dihapus karena memiliki riwayat transaksi");
  }

  await prisma.customer.delete({ where: { id: customerId } });
  return apiSuccess({ message: "Pelanggan dihapus" });
}
