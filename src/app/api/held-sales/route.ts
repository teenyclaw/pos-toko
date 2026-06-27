import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { heldSaleSchema } from "@/lib/validations";

function calcTotal(cartData: {
  items: Array<{ quantity: number; unitPrice: number; discount: number }>;
  transactionDiscount: number;
  taxPercent: number;
}) {
  const subtotal = cartData.items.reduce(
    (s, i) => s + i.quantity * i.unitPrice - i.discount,
    0
  );
  const tax = Math.round(subtotal * (cartData.taxPercent / 100));
  return subtotal - cartData.transactionDiscount + tax;
}

export async function GET() {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const heldSales = await prisma.heldSale.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true } },
    },
  });

  return apiSuccess({
    data: heldSales.map((h) => {
      const cart = h.cartData as {
        items: Array<{ quantity: number; unitPrice: number; discount: number }>;
        transactionDiscount: number;
        taxPercent: number;
      };
      return {
        id: h.id,
        label: h.label,
        customerId: h.customerId,
        customerName: h.customer?.name ?? null,
        itemCount: cart.items?.length ?? 0,
        total: calcTotal({
          items: cart.items ?? [],
          transactionDiscount: cart.transactionDiscount ?? 0,
          taxPercent: cart.taxPercent ?? 11,
        }),
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      };
    }),
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth(["OWNER", "KASIR"]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = heldSaleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const held = await prisma.heldSale.create({
    data: {
      label: parsed.data.label,
      userId: session.user.id,
      customerId: parsed.data.customerId ?? parsed.data.cartData.customerId ?? null,
      cartData: parsed.data.cartData,
    },
    include: { customer: { select: { name: true } } },
  });

  const cart = held.cartData as {
    items: Array<{ quantity: number; unitPrice: number; discount: number }>;
    transactionDiscount: number;
    taxPercent: number;
  };

  return apiSuccess(
    {
      id: held.id,
      label: held.label,
      total: calcTotal({
        items: cart.items,
        transactionDiscount: cart.transactionDiscount ?? 0,
        taxPercent: cart.taxPercent ?? 11,
      }),
    },
    201
  );
}
