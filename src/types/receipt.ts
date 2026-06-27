import { PaymentMethod } from "@prisma/client";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitName: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface ReceiptData {
  storeName: string;
  storeAddress: string;
  storeWhatsapp: string;
  receiptFooter: string;
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  itemDiscount: number;
  transactionDiscount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: PaymentMethod;
}

export interface StoreReceiptSettings {
  store_name: string;
  store_address: string;
  store_whatsapp: string;
  receipt_footer: string;
}
