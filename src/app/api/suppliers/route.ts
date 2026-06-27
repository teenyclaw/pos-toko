import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, parsePagination } from "@/lib/api-utils";
import { supplierSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, search, skip } = parsePagination(searchParams);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const where = {
    ...(activeOnly && { isActive: true }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { contact: { contains: search } },
        { address: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true, purchases: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  return apiSuccess({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const { error } = await requireAuth(["OWNER", "GUDANG"]);
  if (error) return error;

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const supplier = await prisma.supplier.create({ data: parsed.data });
  return apiSuccess(supplier, 201);
}
