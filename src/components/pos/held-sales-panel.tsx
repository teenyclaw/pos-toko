"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Pause, Play, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HeldCartData, HeldSaleSummary } from "@/types/held-sale";

interface HeldSalesPanelProps {
  onRestore: (cartData: HeldCartData, heldId: number) => void;
  onDelete: (heldId: number) => void;
}

export function HeldSalesPanel({ onRestore, onDelete }: HeldSalesPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["held-sales"],
    queryFn: async () => {
      const res = await fetch("/api/held-sales");
      if (!res.ok) throw new Error("Gagal memuat transaksi ditahan");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const heldList: HeldSaleSummary[] = data?.data ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">Memuat transaksi ditahan...</CardContent>
      </Card>
    );
  }

  if (heldList.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pause className="h-4 w-4 text-amber-600" />
          Transaksi Ditahan
          <Badge variant="warning">{heldList.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {heldList.map((held) => (
          <div
            key={held.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-background p-3 text-sm dark:border-amber-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {held.label || `Hold #${held.id}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {held.itemCount} item
                {held.customerName ? ` • ${held.customerName}` : ""}
                {" • "}
                {format(new Date(held.updatedAt), "HH:mm", { locale: localeId })}
              </p>
            </div>
            <span className="shrink-0 font-semibold">{formatCurrency(held.total)}</span>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="default"
                size="sm"
                title="Lanjutkan transaksi"
                onClick={() => handleRestore(held.id, onRestore)}
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Hapus"
                onClick={() => onDelete(held.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function handleRestore(
  heldId: number,
  onRestore: (cartData: HeldCartData, heldId: number) => void
) {
  const res = await fetch(`/api/held-sales/${heldId}`);
  if (!res.ok) return;
  const held = await res.json();
  onRestore(held.cartData as HeldCartData, heldId);
}
