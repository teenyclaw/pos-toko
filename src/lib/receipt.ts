import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { DEFAULT_STORE_SETTINGS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { ReceiptData, StoreReceiptSettings } from "@/types/receipt";
import { PaymentMethod } from "@prisma/client";

export function mergeStoreSettings(
  settings?: Partial<StoreReceiptSettings> | Record<string, string>
): StoreReceiptSettings {
  return {
    store_name: settings?.store_name ?? DEFAULT_STORE_SETTINGS.store_name,
    store_address: settings?.store_address ?? DEFAULT_STORE_SETTINGS.store_address,
    store_whatsapp: settings?.store_whatsapp ?? DEFAULT_STORE_SETTINGS.store_whatsapp,
    receipt_footer: settings?.receipt_footer ?? DEFAULT_STORE_SETTINGS.receipt_footer,
  };
}

interface SaleWithDetails {
  invoiceNumber: string;
  date: Date | string;
  subtotal: number | { toNumber?: () => number } | unknown;
  itemDiscount: number | unknown;
  transactionDiscount: number | unknown;
  tax: number | unknown;
  total: number | unknown;
  paid: number | unknown;
  change: number | unknown;
  paymentMethod: PaymentMethod;
  customer?: { name: string } | null;
  user?: { name: string } | null;
  details: Array<{
    quantity: number | unknown;
    unitPrice: number | unknown;
    discount: number | unknown;
    total: number | unknown;
    product: { name: string };
    unit: { abbreviation: string };
  }>;
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value ?? 0);
}

export function buildReceiptData(
  sale: SaleWithDetails,
  settings?: Partial<StoreReceiptSettings> | Record<string, string>
): ReceiptData {
  const store = mergeStoreSettings(settings);

  return {
    storeName: store.store_name,
    storeAddress: store.store_address,
    storeWhatsapp: store.store_whatsapp,
    receiptFooter: store.receipt_footer,
    invoiceNumber: sale.invoiceNumber,
    date: format(new Date(sale.date), "dd MMM yyyy HH:mm", { locale: localeId }),
    cashierName: sale.user?.name ?? "Kasir",
    customerName: sale.customer?.name,
    items: sale.details.map((d) => ({
      name: d.product.name,
      quantity: num(d.quantity),
      unitName: d.unit.abbreviation,
      unitPrice: num(d.unitPrice),
      discount: num(d.discount),
      total: num(d.total),
    })),
    subtotal: num(sale.subtotal),
    itemDiscount: num(sale.itemDiscount),
    transactionDiscount: num(sale.transactionDiscount),
    tax: num(sale.tax),
    total: num(sale.total),
    paid: num(sale.paid),
    change: num(sale.change),
    paymentMethod: sale.paymentMethod,
  };
}

function line(left: string, right: string, width = 32): string {
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`;
}

function dash(width = 32): string {
  return "-".repeat(width);
}

export function generateReceiptText(data: ReceiptData): string {
  const lines: string[] = [
    data.storeName.toUpperCase(),
    data.storeAddress,
    `WA: ${data.storeWhatsapp}`,
    dash(),
    line("No.", data.invoiceNumber),
    line("Tgl", data.date),
    line("Kasir", data.cashierName),
  ];

  if (data.customerName) {
    lines.push(line("Pelanggan", data.customerName.slice(0, 18)));
  }

  lines.push(dash(), line("Item", "Total"), dash());

  for (const item of data.items) {
    const name = item.name.length > 28 ? `${item.name.slice(0, 27)}…` : item.name;
    lines.push(name);
    const detail = `${item.quantity} ${item.unitName} x ${formatCurrency(item.unitPrice)}`;
    lines.push(line(detail, formatCurrency(item.total)));
    if (item.discount > 0) {
      lines.push(line("  Diskon item", `-${formatCurrency(item.discount)}`));
    }
  }

  lines.push(
    dash(),
    line("Subtotal", formatCurrency(data.subtotal)),
  );

  if (data.itemDiscount > 0) {
    lines.push(line("Diskon item", `-${formatCurrency(data.itemDiscount)}`));
  }
  if (data.transactionDiscount > 0) {
    lines.push(line("Diskon trx", `-${formatCurrency(data.transactionDiscount)}`));
  }
  if (data.tax > 0) {
    lines.push(line("Pajak", formatCurrency(data.tax)));
  }

  lines.push(
    line("TOTAL", formatCurrency(data.total)),
    line("Bayar", formatCurrency(data.paid)),
  );

  if (data.paymentMethod !== "TEMPO" && data.change > 0) {
    lines.push(line("Kembali", formatCurrency(data.change)));
  }

  lines.push(
    line("Metode", PAYMENT_METHOD_LABELS[data.paymentMethod]),
    dash(),
    data.receiptFooter,
    "",
  );

  return lines.join("\n");
}

export function generateReceiptHtml(data: ReceiptData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
      <div class="item">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-row">
          <span>${item.quantity} ${escapeHtml(item.unitName)} × ${formatCurrency(item.unitPrice)}</span>
          <span>${formatCurrency(item.total)}</span>
        </div>
        ${item.discount > 0 ? `<div class="item-discount">Diskon: -${formatCurrency(item.discount)}</div>` : ""}
      </div>`
    )
    .join("");

  return `
    <div class="receipt">
      <div class="center bold">${escapeHtml(data.storeName)}</div>
      <div class="center small">${escapeHtml(data.storeAddress)}</div>
      <div class="center small">WA: ${escapeHtml(data.storeWhatsapp)}</div>
      <div class="divider"></div>
      <div class="row"><span>No. Invoice</span><span>${escapeHtml(data.invoiceNumber)}</span></div>
      <div class="row"><span>Tanggal</span><span>${escapeHtml(data.date)}</span></div>
      <div class="row"><span>Kasir</span><span>${escapeHtml(data.cashierName)}</span></div>
      ${data.customerName ? `<div class="row"><span>Pelanggan</span><span>${escapeHtml(data.customerName)}</span></div>` : ""}
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(data.subtotal)}</span></div>
      ${data.itemDiscount > 0 ? `<div class="row"><span>Diskon item</span><span>-${formatCurrency(data.itemDiscount)}</span></div>` : ""}
      ${data.transactionDiscount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatCurrency(data.transactionDiscount)}</span></div>` : ""}
      ${data.tax > 0 ? `<div class="row"><span>Pajak</span><span>${formatCurrency(data.tax)}</span></div>` : ""}
      <div class="row bold total"><span>TOTAL</span><span>${formatCurrency(data.total)}</span></div>
      <div class="row"><span>Bayar</span><span>${formatCurrency(data.paid)}</span></div>
      ${data.paymentMethod !== "TEMPO" && data.change > 0 ? `<div class="row"><span>Kembali</span><span>${formatCurrency(data.change)}</span></div>` : ""}
      <div class="row"><span>Metode</span><span>${PAYMENT_METHOD_LABELS[data.paymentMethod]}</span></div>
      <div class="divider"></div>
      <div class="center small footer">${escapeHtml(data.receiptFooter)}</div>
    </div>
  `;
}

export const RECEIPT_PRINT_STYLES = `
  @page { size: 58mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Courier New", Courier, monospace; font-size: 11px; line-height: 1.35; color: #000; background: #fff; width: 54mm; margin: 0 auto; }
  .receipt { width: 100%; padding: 2mm 0; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .small { font-size: 10px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 4px; margin: 2px 0; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .total { font-size: 13px; margin-top: 4px; }
  .item { margin-bottom: 6px; }
  .item-name { font-weight: bold; margin-bottom: 1px; word-break: break-word; }
  .item-row { display: flex; justify-content: space-between; font-size: 10px; }
  .item-discount { font-size: 10px; color: #444; padding-left: 4px; }
  .footer { margin-top: 4px; padding-top: 4px; }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printReceiptHtml(html: string): void {
  const printWindow = window.open("", "_blank", "width=320,height=640");
  if (!printWindow) {
    alert("Popup diblokir. Izinkan popup untuk cetak struk.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk ${new Date().toLocaleString("id-ID")}</title>
  <style>${RECEIPT_PRINT_STYLES}</style>
</head>
<body>${html}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export function printReceipt(data: ReceiptData): void {
  printReceiptHtml(generateReceiptHtml(data));
}
