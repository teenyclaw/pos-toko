import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const barcode = searchParams.get("barcode");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(barcode ? { barcode } : q ? {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { barcode: { contains: q } },
        ],
      } : {}),
    },
    take: 20,
    include: {
      category: true,
      baseUnit: true,
      unitPrices: { include: { unit: true } },
      conversions: { include: { fromUnit: true, toUnit: true } },
    },
    orderBy: { name: "asc" },
  });

  return apiSuccess({ data: products });
}
