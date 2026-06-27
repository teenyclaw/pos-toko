import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const slug = slugify(parsed.data.name);
  const category = await prisma.category.update({
    where: { id: parseInt(id, 10) },
    data: { name: parsed.data.name, slug, type: parsed.data.type },
  });

  return apiSuccess(category);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const { id } = await params;
  const productCount = await prisma.product.count({ where: { categoryId: parseInt(id, 10) } });
  if (productCount > 0) return apiError("Kategori masih digunakan produk");

  await prisma.category.delete({ where: { id: parseInt(id, 10) } });
  return apiSuccess({ message: "Deleted" });
}
