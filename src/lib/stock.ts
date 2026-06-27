import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type TxClient = Prisma.TransactionClient;

export async function convertToBaseUnit(
  productId: number,
  fromUnitId: number,
  quantity: number
): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      conversions: {
        include: { fromUnit: true, toUnit: true },
      },
    },
  });

  if (!product) throw new Error("Produk tidak ditemukan");
  if (fromUnitId === product.baseUnitId) return quantity;

  const visited = new Set<number>();
  let currentUnitId = fromUnitId;
  let currentQty = new Decimal(quantity);

  while (currentUnitId !== product.baseUnitId) {
    if (visited.has(currentUnitId)) {
      throw new Error("Konversi satuan tidak valid");
    }
    visited.add(currentUnitId);

    const conversion = product.conversions.find(
      (c) => c.fromUnitId === currentUnitId
    );

    if (!conversion) {
      throw new Error(
        `Konversi dari satuan ID ${currentUnitId} ke satuan dasar tidak ditemukan`
      );
    }

    currentQty = currentQty.mul(conversion.factor);
    currentUnitId = conversion.toUnitId;
  }

  return currentQty.toNumber();
}

export async function getProductUnits(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      baseUnit: true,
      unitPrices: { include: { unit: true } },
      conversions: { include: { fromUnit: true, toUnit: true } },
    },
  });

  if (!product) return [];

  const units = new Map<number, { id: number; name: string; abbreviation: string; sellPrice: number }>();
  units.set(product.baseUnitId, {
    id: product.baseUnit.id,
    name: product.baseUnit.name,
    abbreviation: product.baseUnit.abbreviation,
    sellPrice: Number(product.sellPrice),
  });

  for (const up of product.unitPrices) {
    units.set(up.unitId, {
      id: up.unit.id,
      name: up.unit.name,
      abbreviation: up.unit.abbreviation,
      sellPrice: Number(up.sellPrice),
    });
  }

  for (const conv of product.conversions) {
    if (!units.has(conv.fromUnitId)) {
      units.set(conv.fromUnitId, {
        id: conv.fromUnit.id,
        name: conv.fromUnit.name,
        abbreviation: conv.fromUnit.abbreviation,
        sellPrice: Number(product.sellPrice),
      });
    }
  }

  return Array.from(units.values());
}

export async function adjustStock(
  productId: number,
  userId: string,
  type: "IN" | "OUT" | "ADJUSTMENT" | "OPNAME" | "SALE" | "PURCHASE" | "RETURN",
  quantityDelta: number,
  referenceType?: string,
  referenceId?: number,
  notes?: string,
  txClient?: TxClient
) {
  const run = async (tx: TxClient) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Produk tidak ditemukan");

    const stockBefore = Number(product.stock);
    const stockAfter = stockBefore + quantityDelta;

    if (stockAfter < 0) {
      throw new Error(`Stok ${product.name} tidak mencukupi`);
    }

    await tx.product.update({
      where: { id: productId },
      data: { stock: stockAfter },
    });

    await tx.stockMovement.create({
      data: {
        productId,
        userId,
        type,
        quantity: Math.abs(quantityDelta),
        stockBefore,
        stockAfter,
        referenceType,
        referenceId,
        notes,
      },
    });

    return stockAfter;
  };

  if (txClient) return run(txClient);
  return prisma.$transaction(run);
}
