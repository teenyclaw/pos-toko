import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, parsePagination } from "@/lib/api-utils";
import { productWithUnitsSchema } from "@/lib/validations";
import { generateBarcode } from "@/lib/utils";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, search, skip } = parsePagination(searchParams);
  const categoryId = searchParams.get("categoryId");

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
        { barcode: { contains: search } },
      ],
    }),
    ...(categoryId && { categoryId: parseInt(categoryId, 10) }),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: { category: true, baseUnit: true, supplier: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return apiSuccess({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "GUDANG"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = productWithUnitsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const existing = await prisma.product.findFirst({
    where: { OR: [{ code: parsed.data.code }, ...(parsed.data.barcode ? [{ barcode: parsed.data.barcode }] : [])] },
  });
  if (existing) return apiError("Kode atau barcode sudah digunakan");

  const { unitPrices, conversions, ...productData } = parsed.data;

  const product = await prisma.product.create({
    data: {
      ...productData,
      barcode: productData.barcode || generateBarcode(),
      supplierId: productData.supplierId ?? null,
      unitPrices: unitPrices?.length
        ? { create: unitPrices.map((up) => ({ unitId: up.unitId, sellPrice: up.sellPrice })) }
        : undefined,
      conversions: conversions?.length
        ? { create: conversions.map((c) => ({ fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: c.factor })) }
        : undefined,
    },
    include: {
      category: true,
      baseUnit: true,
      supplier: true,
      unitPrices: { include: { unit: true } },
      conversions: { include: { fromUnit: true, toUnit: true } },
    },
  });

  if (Number(parsed.data.stock) > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        userId: session.user.id,
        type: "IN",
        quantity: Number(parsed.data.stock),
        stockBefore: 0,
        stockAfter: Number(parsed.data.stock),
        notes: "Stok awal produk",
      },
    });
  }

  return apiSuccess(product, 201);
}
