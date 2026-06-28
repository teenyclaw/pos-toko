import { UserRole } from "@prisma/client";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "POS Toko Plastik & Bahan Kue";

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  KASIR: "Kasir",
  GUDANG: "Gudang",
};

export const PAYMENT_METHOD_LABELS = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer Bank",
  TEMPO: "Tempo",
} as const;

export const STOCK_TYPE_LABELS = {
  IN: "Stok Masuk",
  OUT: "Stok Keluar",
  ADJUSTMENT: "Penyesuaian",
  OPNAME: "Stok Opname",
  SALE: "Penjualan",
  PURCHASE: "Pembelian",
  RETURN: "Retur",
} as const;

export const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
}> = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["OWNER", "KASIR", "GUDANG"] },
  { href: "/pos", label: "Kasir POS", icon: "ShoppingCart", roles: ["OWNER", "KASIR"] },
  { href: "/products", label: "Produk", icon: "Package", roles: ["OWNER", "GUDANG"] },
  { href: "/categories", label: "Kategori", icon: "Tags", roles: ["OWNER", "GUDANG"] },
  { href: "/units", label: "Satuan", icon: "Ruler", roles: ["OWNER", "GUDANG"] },
  { href: "/suppliers", label: "Supplier", icon: "Truck", roles: ["OWNER", "GUDANG"] },
  { href: "/customers", label: "Pelanggan", icon: "Users", roles: ["OWNER", "KASIR"] },
  { href: "/purchases", label: "Pembelian", icon: "ShoppingBag", roles: ["OWNER", "GUDANG"] },
  { href: "/stock", label: "Stok", icon: "Warehouse", roles: ["OWNER", "GUDANG"] },
  { href: "/expenses", label: "Beban Operasional", icon: "Receipt", roles: ["OWNER"] },
  { href: "/finance", label: "Piutang & Hutang", icon: "Wallet", roles: ["OWNER"] },
  { href: "/reports", label: "Laporan", icon: "BarChart3", roles: ["OWNER"] },
  { href: "/settings", label: "Pengaturan", icon: "Settings", roles: ["OWNER"] },
  { href: "/users", label: "Manajemen User", icon: "UserCog", roles: ["OWNER"] },
];

export const PLASTIC_CATEGORIES = [
  "Kantong Kresek",
  "Plastik Kiloan",
  "Mika",
  "Cup Plastik",
  "Sedotan",
  "Wadah Makanan",
  "Plastik Vakum",
];

export const BAKING_CATEGORIES = [
  "Tepung",
  "Gula",
  "Mentega",
  "Coklat",
  "Keju",
  "Pewarna Makanan",
  "Baking Powder",
  "Ragi",
];

export const DEFAULT_STORE_SETTINGS = {
  store_name: "Toko Plastik & Bahan Kue Sejahtera",
  store_address: "Jl. Pasar Induk No. 12, Jakarta",
  store_whatsapp: "6281234567890",
  receipt_footer: "Terima kasih atas kunjungan Anda!",
  default_tax: "11",
  store_logo: "",
};
