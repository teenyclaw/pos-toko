import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return apiSuccess({ data: categories });
}

export async function POST(request: Request) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const slug = slugify(parsed.data.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return apiError("Kategori dengan nama serupa sudah ada");

  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug, type: parsed.data.type },
  });

  return apiSuccess(category, 201);
}
