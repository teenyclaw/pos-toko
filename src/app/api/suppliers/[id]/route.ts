import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { supplierSchema } from "@/lib/validations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const supplierId = parseInt(id, 10);

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      _count: { select: { products: true, purchases: true } },
      purchases: {
        take: 20,
        orderBy: { date: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          total: true,
          status: true,
        },
      },
      products: {
        take: 10,
        select: { id: true, code: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!supplier) return apiError("Supplier tidak ditemukan", 404);

  return apiSuccess({
    ...supplier,
    purchases: supplier.purchases.map((p) => ({ ...p, total: Number(p.total) })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const supplier = await prisma.supplier.update({
    where: { id: parseInt(id, 10) },
    data: parsed.data,
  });

  return apiSuccess(supplier);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { id } = await params;
  const supplierId = parseInt(id, 10);

  const [productCount, purchaseCount] = await Promise.all([
    prisma.product.count({ where: { supplierId } }),
    prisma.purchase.count({ where: { supplierId } }),
  ]);

  if (productCount > 0 || purchaseCount > 0) {
    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    });
    return apiSuccess({ ...supplier, message: "Supplier dinonaktifkan karena masih terhubung ke produk/pembelian" });
  }

  await prisma.supplier.delete({ where: { id: supplierId } });
  return apiSuccess({ message: "Supplier dihapus" });
}
