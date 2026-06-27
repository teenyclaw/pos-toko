import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  type: z.enum(["PLASTIK", "BAHAN_KUE"]),
});

export const unitSchema = z.object({
  name: z.string().min(1, "Nama satuan wajib diisi"),
  abbreviation: z.string().min(1, "Singkatan wajib diisi").max(20),
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Nama supplier minimal 2 karakter"),
  contact: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().min(2, "Nama pelanggan minimal 2 karakter"),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  points: z.coerce.number().int().min(0).optional(),
});

export const productSchema = z.object({
  code: z.string().min(1, "Kode produk wajib diisi"),
  barcode: z.string().optional(),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  categoryId: z.coerce.number().int().positive(),
  baseUnitId: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  buyPrice: z.coerce.number().min(0),
  sellPrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["OWNER", "KASIR", "GUDANG"]),
  isActive: z.boolean().default(true),
});

export const saleItemSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
});

export const saleSchema = z.object({
  customerId: z.number().int().positive().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Minimal 1 item"),
  transactionDiscount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  paid: z.number().min(0),
  paymentMethod: z.enum(["CASH", "QRIS", "TRANSFER", "TEMPO"]),
  notes: z.string().optional(),
});

export const purchaseItemSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const purchaseSchema = z.object({
  supplierId: z.number().int().positive(),
  items: z.array(purchaseItemSchema).min(1),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "OPNAME"]),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const storeSettingSchema = z.object({
  store_name: z.string().min(2),
  store_address: z.string().min(5),
  store_whatsapp: z.string().min(10),
  receipt_footer: z.string(),
  default_tax: z.coerce.number().min(0).max(100),
});

export const heldCartItemSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  name: z.string(),
  unitName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  stock: z.number().min(0).default(0),
});

export const heldCartDataSchema = z.object({
  items: z.array(heldCartItemSchema).min(1),
  transactionDiscount: z.number().min(0).default(0),
  taxPercent: z.number().min(0).max(100).default(11),
  paid: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "QRIS", "TRANSFER", "TEMPO"]).default("CASH"),
  customerId: z.number().int().positive().nullable().optional(),
});

export const heldSaleSchema = z.object({
  label: z.string().optional(),
  customerId: z.number().int().positive().optional().nullable(),
  cartData: heldCartDataSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
