"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { printReceipt } from "@/lib/receipt";
import type { ReceiptData } from "@/types/receipt";

export default function ReceiptPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Transaksi tidak ditemukan");
        return res.json();
      })
      .then((data) => {
        setReceipt(data.receipt);
        setTimeout(() => printReceipt(data.receipt), 400);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p>Memuat struk...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 print:py-0">
      <ReceiptView data={receipt} />
    </div>
  );
}
