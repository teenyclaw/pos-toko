import { PrismaClient, CategoryType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BAKING_CATEGORIES, DEFAULT_STORE_SETTINGS, PLASTIC_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const password = await bcrypt.hash("password", 10);

  await prisma.user.upsert({
    where: { email: "owner@toko.com" },
    update: {},
    create: { name: "Owner Toko", email: "owner@toko.com", password, role: UserRole.OWNER },
  });
  await prisma.user.upsert({
    where: { email: "kasir@toko.com" },
    update: {},
    create: { name: "Kasir Utama", email: "kasir@toko.com", password, role: UserRole.KASIR },
  });
  await prisma.user.upsert({
    where: { email: "gudang@toko.com" },
    update: {},
    create: { name: "Staff Gudang", email: "gudang@toko.com", password, role: UserRole.GUDANG },
  });

  for (const [key, value] of Object.entries(DEFAULT_STORE_SETTINGS)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const unitData = [
    { name: "Pieces", abbreviation: "Pcs" },
    { name: "Pack", abbreviation: "Pack" },
    { name: "Dus", abbreviation: "Dus" },
    { name: "Kilogram", abbreviation: "Kg" },
    { name: "Gram", abbreviation: "Gr" },
    { name: "Karung", abbreviation: "Krg" },
    { name: "Liter", abbreviation: "L" },
  ];

  for (const u of unitData) {
    const existing = await prisma.unit.findFirst({ where: { abbreviation: u.abbreviation } });
    if (!existing) await prisma.unit.create({ data: u });
  }

  const unitMap = Object.fromEntries(
    (await prisma.unit.findMany()).map((u) => [u.abbreviation, u.id])
  );

  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: "CV Plastik Jaya", contact: "081234567890", address: "Jakarta Utara" } }),
    prisma.supplier.create({ data: { name: "PT Bahan Kue Nusantara", contact: "081987654321", address: "Tangerang" } }),
    prisma.supplier.create({ data: { name: "UD Kemasan Makmur", contact: "08111222333", address: "Bekasi" } }),
  ]);

  const categories: Array<{ id: number; slug: string; name: string }> = [];

  for (const name of PLASTIC_CATEGORIES) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, type: CategoryType.PLASTIK },
    });
    categories.push(cat);
  }

  for (const name of BAKING_CATEGORIES) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, type: CategoryType.BAHAN_KUE },
    });
    categories.push(cat);
  }

  const productsData = [
    { code: "PLA00001", name: "Kantong Kresek Hitam Kecil", categorySlug: "kantong-kresek", unit: "Pcs", buy: 3000, sell: 5000, stock: 500, min: 100, supplier: 0 },
    { code: "PLA00002", name: "Plastik Kiloan 24x35", categorySlug: "plastik-kiloan", unit: "Pack", buy: 15000, sell: 22000, stock: 80, min: 20, supplier: 0 },
    { code: "PLA00003", name: "Mika Bulat Diameter 15cm", categorySlug: "mika", unit: "Pcs", buy: 800, sell: 1500, stock: 200, min: 50, supplier: 2 },
    { code: "PLA00004", name: "Cup Plastik 12oz", categorySlug: "cup-plastik", unit: "Pcs", buy: 350, sell: 600, stock: 1000, min: 200, supplier: 0 },
    { code: "PLA00005", name: "Sedotan Warna 100pcs", categorySlug: "sedotan", unit: "Pack", buy: 5000, sell: 8500, stock: 60, min: 15, supplier: 2 },
    { code: "BAK00001", name: "Tepung Segitiga Biru 1Kg", categorySlug: "tepung", unit: "Kg", buy: 12000, sell: 15500, stock: 45, min: 10, supplier: 1 },
    { code: "BAK00002", name: "Gula Pasir Premium", categorySlug: "gula", unit: "Kg", buy: 14000, sell: 17000, stock: 100, min: 25, supplier: 1 },
    { code: "BAK00003", name: "Mentega Royal 200gr", categorySlug: "mentega", unit: "Pcs", buy: 18000, sell: 22000, stock: 30, min: 10, supplier: 1 },
    { code: "BAK00004", name: "Coklat Batang Compound 1Kg", categorySlug: "coklat", unit: "Kg", buy: 45000, sell: 55000, stock: 15, min: 5, supplier: 1 },
    { code: "BAK00005", name: "Baking Powder 100gr", categorySlug: "baking-powder", unit: "Pcs", buy: 8000, sell: 12000, stock: 25, min: 8, supplier: 1 },
  ];

  const owner = await prisma.user.findUnique({ where: { email: "owner@toko.com" } });

  for (const p of productsData) {
    const category = categories.find((c) => c.slug === p.categorySlug);
    if (!category) continue;

    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        barcode: `899${p.code.replace(/\D/g, "").padStart(10, "0")}`,
        name: p.name,
        categoryId: category.id,
        baseUnitId: unitMap[p.unit],
        buyPrice: p.buy,
        sellPrice: p.sell,
        stock: p.stock,
        minStock: p.min,
        supplierId: suppliers[p.supplier]?.id,
      },
    });

    if (owner) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId: owner.id,
          type: "IN",
          quantity: p.stock,
          stockBefore: 0,
          stockAfter: p.stock,
          notes: "Stok awal seed",
        },
      });
    }
  }

  const gula = await prisma.product.findUnique({ where: { code: "BAK00002" } });
  if (gula) {
    await prisma.unitConversion.createMany({
      data: [
        { productId: gula.id, fromUnitId: unitMap["Krg"], toUnitId: unitMap["Kg"], factor: 50 },
        { productId: gula.id, fromUnitId: unitMap["Kg"], toUnitId: unitMap["Gr"], factor: 1000 },
      ],
      skipDuplicates: true,
    });
    await prisma.productUnitPrice.createMany({
      data: [
        { productId: gula.id, unitId: unitMap["Krg"], sellPrice: 750000 },
        { productId: gula.id, unitId: unitMap["Gr"], sellPrice: 20 },
      ],
      skipDuplicates: true,
    });
  }

  const cup = await prisma.product.findUnique({ where: { code: "PLA00004" } });
  if (cup) {
    await prisma.unitConversion.createMany({
      data: [
        { productId: cup.id, fromUnitId: unitMap["Dus"], toUnitId: unitMap["Pack"], factor: 20 },
        { productId: cup.id, fromUnitId: unitMap["Pack"], toUnitId: unitMap["Pcs"], factor: 50 },
      ],
      skipDuplicates: true,
    });
    await prisma.productUnitPrice.createMany({
      data: [
        { productId: cup.id, unitId: unitMap["Dus"], sellPrice: 550000 },
        { productId: cup.id, unitId: unitMap["Pack"], sellPrice: 28000 },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.customer.createMany({
    data: [
      { name: "Toko Kue Bahagia", whatsapp: "628111111111", address: "Jakarta Selatan", points: 150, creditLimit: 5000000 },
      { name: "Warung Makan Sederhana", whatsapp: "628222222222", address: "Depok", points: 50, creditLimit: 2000000 },
      { name: "CV Catering Nusantara", whatsapp: "628333333333", address: "Tangerang", points: 300, creditLimit: 10000000 },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed selesai!");
  console.log("   Owner: owner@toko.com / password");
  console.log("   Kasir: kasir@toko.com / password");
  console.log("   Gudang: gudang@toko.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
