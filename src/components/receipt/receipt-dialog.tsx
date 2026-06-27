"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { Button } from "@/components/ui/button";
import { printReceipt } from "@/lib/receipt";
import type { ReceiptData } from "@/types/receipt";

interface ReceiptDialogProps {
  data: ReceiptData | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export function ReceiptDialog({ data, onClose, autoPrint = true }: ReceiptDialogProps) {
  useEffect(() => {
    if (data && autoPrint) {
      const timer = setTimeout(() => printReceipt(data), 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Struk Transaksi</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center bg-muted/30 py-4">
          <ReceiptView data={data} />
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button className="flex-1" onClick={() => printReceipt(data)}>
            <Printer className="h-4 w-4" />
            Cetak Struk
          </Button>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
