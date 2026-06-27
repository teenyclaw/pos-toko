import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError, parsePagination } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validations";

function serializeCustomer<T extends { creditLimit: unknown; balance: unknown }>(customer: T) {
  return {
    ...customer,
    creditLimit: Number(customer.creditLimit),
    balance: Number(customer.balance),
  };
}

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, search, skip } = parsePagination(searchParams);

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { whatsapp: { contains: search } },
          { address: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { sales: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return apiSuccess({
    data: data.map(serializeCustomer),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const { error } = await requireAuth(["OWNER", "KASIR"]);
  if (error) return error;

  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const customer = await prisma.customer.create({ data: parsed.data });
  return apiSuccess(serializeCustomer(customer), 201);
}
