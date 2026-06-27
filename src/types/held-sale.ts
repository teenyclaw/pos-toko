export interface HeldCartItem {
  productId: number;
  unitId: number;
  name: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  stock: number;
}

export interface HeldCartData {
  items: HeldCartItem[];
  transactionDiscount: number;
  taxPercent: number;
  paid: number;
  paymentMethod: "CASH" | "QRIS" | "TRANSFER" | "TEMPO";
  customerId: number | null;
}

export interface HeldSaleSummary {
  id: number;
  label: string | null;
  customerId: number | null;
  customerName: string | null;
  itemCount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}
