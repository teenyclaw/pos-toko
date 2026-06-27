import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { stockAdjustmentSchema } from "@/lib/validations";
import { adjustStock } from "@/lib/stock";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const movements = await prisma.stockMovement.findMany({
    where: productId ? { productId: parseInt(productId, 10) } : {},
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, code: true } },
      user: { select: { name: true } },
    },
  });

  return apiSuccess({
    data: movements.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
      stockBefore: Number(m.stockBefore),
      stockAfter: Number(m.stockAfter),
    })),
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "GUDANG"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = stockAdjustmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return apiError("Produk tidak ditemukan");

  let delta: number;
  if (parsed.data.type === "OPNAME") {
    delta = parsed.data.quantity - Number(product.stock);
  } else if (parsed.data.type === "OUT") {
    delta = -parsed.data.quantity;
  } else {
    delta = parsed.data.quantity;
  }

  const stockAfter = await adjustStock(
    parsed.data.productId,
    session.user.id,
    parsed.data.type,
    delta,
    "MANUAL",
    undefined,
    parsed.data.notes
  );

  return apiSuccess({ stockAfter }, 201);
}
