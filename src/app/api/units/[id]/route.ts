import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { unitSchema } from "@/lib/validations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const unit = await prisma.unit.update({
    where: { id: parseInt(id, 10) },
    data: parsed.data,
  });

  return apiSuccess(unit);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const unitId = parseInt(id, 10);

  const used = await prisma.product.count({ where: { baseUnitId: unitId } });
  if (used > 0) return apiError("Satuan masih digunakan produk");

  await prisma.unit.delete({ where: { id: unitId } });
  return apiSuccess({ message: "Satuan dihapus" });
}
