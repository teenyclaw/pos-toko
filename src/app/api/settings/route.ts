import prisma from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await prisma.storeSetting.findMany();
  const data = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return apiSuccess(data);
}

export async function PUT(request: Request) {
  const { error } = await requireAuth(["OWNER"]);
  if (error) return error;

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  return apiSuccess({ message: "Settings updated" });
}
