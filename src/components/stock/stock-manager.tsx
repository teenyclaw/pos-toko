"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Package, ArrowDown, ArrowUp, ClipboardList } from "lucide-react";
import { useState } from "react";
import { STOCK_TYPE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Movement {
  id: number;
  type: keyof typeof STOCK_TYPE_LABELS;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  createdAt: string;
  product: { name: string; code: string };
  user: { name: string };
}

export function StockManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT" | "OPNAME">("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-stock"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=100");
      return res.json();
    },
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const res = await fetch("/api/stock");
      if (!res.ok) throw new Error("Gagal memuat mutasi");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parseInt(productId, 10),
          type,
          quantity: parseFloat(quantity),
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Berhasil", description: `Stok sekarang: ${formatNumber(data.stockAfter, 2)}` });
      setQuantity("");
      setNotes("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const typeHint =
    type === "OPNAME"
      ? "Masukkan stok hasil hitung fisik"
      : type === "OUT"
        ? "Jumlah stok keluar"
        : "Jumlah stok masuk";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Mutasi Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Produk</Label>
            <select
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Pilih produk...</option>
              {products?.data?.map((p: { id: number; name: string; code: string; stock: number; baseUnit: { abbreviation: string } }) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} (Stok: {Number(p.stock)} {p.baseUnit.abbreviation})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["IN", "OUT", "ADJUSTMENT", "OPNAME"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? "default" : "outline"}
                size="sm"
                onClick={() => setType(t)}
              >
                {t === "IN" && <ArrowDown className="h-3 w-3" />}
                {t === "OUT" && <ArrowUp className="h-3 w-3" />}
                {t === "OPNAME" && <ClipboardList className="h-3 w-3" />}
                {STOCK_TYPE_LABELS[t]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>{typeHint}</Label>
            <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
          </div>
          <Button
            className="w-full"
            disabled={!productId || !quantity || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Simpan Mutasi
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Riwayat Mutasi Stok</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Waktu</th>
                  <th className="px-4 py-2 text-left">Produk</th>
                  <th className="px-4 py-2 text-left">Tipe</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Stok</th>
                  <th className="px-4 py-2 text-left">Oleh</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (
                  movements?.data?.map((m: Movement) => (
                    <tr key={m.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2 whitespace-nowrap text-xs">
                        {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: localeId })}
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-medium">{m.product.name}</p>
                        <p className="text-xs text-muted-foreground">{m.product.code}</p>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{STOCK_TYPE_LABELS[m.type]}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">{formatNumber(m.quantity, 2)}</td>
                      <td className="px-4 py-2 text-right text-xs">
                        {formatNumber(m.stockBefore, 2)} → {formatNumber(m.stockAfter, 2)}
                      </td>
                      <td className="px-4 py-2">{m.user.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
