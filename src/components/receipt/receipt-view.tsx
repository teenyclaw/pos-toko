"use client";

import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { ReceiptData } from "@/types/receipt";

interface ReceiptViewProps {
  data: ReceiptData;
  className?: string;
}

export function ReceiptView({ data, className = "" }: ReceiptViewProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[280px] bg-white p-4 font-mono text-[11px] leading-snug text-black ${className}`}
    >
      <div className="text-center">
        <p className="text-sm font-bold">{data.storeName}</p>
        <p className="text-[10px]">{data.storeAddress}</p>
        <p className="text-[10px]">WA: {data.storeWhatsapp}</p>
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="space-y-0.5">
        <Row label="No. Invoice" value={data.invoiceNumber} />
        <Row label="Tanggal" value={data.date} />
        <Row label="Kasir" value={data.cashierName} />
        {data.customerName && <Row label="Pelanggan" value={data.customerName} />}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div key={i}>
            <p className="font-bold">{item.name}</p>
            <div className="flex justify-between text-[10px]">
              <span>
                {item.quantity} {item.unitName} × {formatCurrency(item.unitPrice)}
              </span>
              <span>{formatCurrency(item.total)}</span>
            </div>
            {item.discount > 0 && (
              <p className="text-[10px] text-gray-600">Diskon: -{formatCurrency(item.discount)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="space-y-0.5">
        <Row label="Subtotal" value={formatCurrency(data.subtotal)} />
        {data.itemDiscount > 0 && <Row label="Diskon item" value={`-${formatCurrency(data.itemDiscount)}`} />}
        {data.transactionDiscount > 0 && <Row label="Diskon" value={`-${formatCurrency(data.transactionDiscount)}`} />}
        {data.tax > 0 && <Row label="Pajak" value={formatCurrency(data.tax)} />}
        <Row label="TOTAL" value={formatCurrency(data.total)} bold />
        <Row label="Bayar" value={formatCurrency(data.paid)} />
        {data.paymentMethod !== "TEMPO" && data.change > 0 && (
          <Row label="Kembali" value={formatCurrency(data.change)} />
        )}
        <Row label="Metode" value={PAYMENT_METHOD_LABELS[data.paymentMethod]} />
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <p className="text-center text-[10px]">{data.receiptFooter}</p>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "text-xs font-bold" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
