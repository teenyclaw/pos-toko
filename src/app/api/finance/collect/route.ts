import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { paymentCollectionSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = paymentCollectionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { customerId, supplierId, amount, method, notes } = parsed.data;

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return apiError("Pelanggan tidak ditemukan", 404);
    if (Number(customer.balance) < amount) {
      return apiError(`Saldo hutang hanya ${Number(customer.balance).toLocaleString("id-ID")}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: amount } },
      });
      await tx.payment.create({
        data: {
          type: "RECEIVABLE",
          amount: -amount,
          method,
          notes: notes ?? "Pelunasan piutang",
          customerId,
        },
      });
    });

    return apiSuccess({ message: "Pelunasan piutang berhasil" });
  }

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return apiError("Supplier tidak ditemukan", 404);
    if (Number(supplier.balance) < amount) {
      return apiError(`Saldo hutang hanya ${Number(supplier.balance).toLocaleString("id-ID")}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: amount } },
      });
      await tx.payment.create({
        data: {
          type: "PAYABLE",
          amount: -amount,
          method,
          notes: notes ?? "Pelunasan hutang supplier",
          supplierId,
        },
      });
    });

    return apiSuccess({ message: "Pelunasan hutang supplier berhasil" });
  }

  return apiError("Pilih pelanggan atau supplier");
}
