import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { productWithUnitsSchema } from "@/lib/validations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      category: true,
      baseUnit: true,
      supplier: true,
      unitPrices: { include: { unit: true } },
      conversions: { include: { fromUnit: true, toUnit: true } },
    },
  });

  if (!product) return apiError("Produk tidak ditemukan", 404);
  return apiSuccess(product);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = productWithUnitsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const productId = parseInt(id, 10);
  const { unitPrices, conversions, ...productData } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.productUnitPrice.deleteMany({ where: { productId } });
    await tx.unitConversion.deleteMany({ where: { productId } });

    await tx.product.update({
      where: { id: productId },
      data: {
        ...productData,
        supplierId: productData.supplierId ?? null,
        unitPrices: unitPrices?.length
          ? { create: unitPrices.map((up) => ({ unitId: up.unitId, sellPrice: up.sellPrice })) }
          : undefined,
        conversions: conversions?.length
          ? { create: conversions.map((c) => ({ fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: c.factor })) }
          : undefined,
      },
    });
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      baseUnit: true,
      supplier: true,
      unitPrices: { include: { unit: true } },
      conversions: { include: { fromUnit: true, toUnit: true } },
    },
  });

  return apiSuccess(product);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const { id } = await params;
  await prisma.product.update({
    where: { id: parseInt(id, 10) },
    data: { isActive: false },
  });

  return apiSuccess({ message: "Produk dinonaktifkan" });
}
