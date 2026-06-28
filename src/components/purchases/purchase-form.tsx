"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface PurchaseItem {
  productId: number;
  unitId: number;
  name: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
}

export function PurchaseForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "TEMPO">("CASH");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await fetch("/api/suppliers?limit=100")).json(),
  });

  const { data: products } = useQuery({
    queryKey: ["products-purchase"],
    queryFn: async () => (await fetch("/api/products?limit=100")).json(),
  });

  const { data: purchases, refetch } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => (await fetch("/api/purchases?limit=10")).json(),
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal - discount + tax;

  const addItem = () => {
    const product = products?.data?.find((p: { id: number }) => p.id === parseInt(selectedProduct, 10));
    if (!product) return;
    setItems([
      ...items,
      {
        productId: product.id,
        unitId: product.baseUnitId,
        name: product.name,
        unitName: product.baseUnit.abbreviation,
        quantity: parseFloat(qty) || 1,
        unitPrice: parseFloat(price) || Number(product.buyPrice),
      },
    ]);
    setSelectedProduct("");
    setQty("1");
    setPrice("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: parseInt(supplierId, 10),
          items: items.map((i) => ({
            productId: i.productId,
            unitId: i.unitId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          discount,
          tax,
          paymentMethod,
          paid: paymentMethod === "TEMPO" ? 0 : total,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Pembelian berhasil", description: data.invoiceNumber });
      setItems([]);
      setSupplierId("");
      setDiscount(0);
      setTax(0);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const returnPurchase = async (id: number) => {
    if (!window.confirm("Retur pembelian ini? Stok akan dikurangi.")) return;
    const res = await fetch(`/api/purchases/${id}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Gagal", description: err.error ?? "Retur gagal", variant: "destructive" });
      return;
    }
    toast({ title: "Berhasil", description: "Retur pembelian berhasil" });
    refetch();
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Input Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <select className="flex h-10 w-full rounded-md border px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Pilih supplier...</option>
              {suppliers?.data?.map((s: { id: number; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Produk</Label>
              <select
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  const p = products?.data?.find((x: { id: number }) => x.id === parseInt(e.target.value, 10));
                  if (p) setPrice(String(Number(p.buyPrice)));
                }}
              >
                <option value="">Pilih...</option>
                {products?.data?.map((p: { id: number; name: string; code: string }) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2"><Label>Qty</Label><Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div className="space-y-2"><Label>Harga</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <Button type="button" variant="outline" onClick={addItem} disabled={!selectedProduct}>
            <Plus className="h-4 w-4" /> Tambah Item
          </Button>

          {items.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span>{item.name} — {item.quantity} {item.unitName} @ {formatCurrency(item.unitPrice)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="border-t pt-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Diskon" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                  <Input type="number" placeholder="Pajak" value={tax || ""} onChange={(e) => setTax(Number(e.target.value))} />
                </div>
                <div className="mt-2 flex justify-between font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
                <div className="mt-3 space-y-2">
                  <Label>Metode Bayar</Label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="flex h-10 w-full rounded-md border px-3 text-sm">
                    <option value="CASH">Tunai (Lunas)</option>
                    <option value="TRANSFER">Transfer (Lunas)</option>
                    <option value="TEMPO">Tempo / Hutang</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <Button className="w-full" disabled={!supplierId || items.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            Simpan Pembelian & Update Stok
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Pembelian</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(purchases?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pembelian</p>
          ) : (
            purchases?.data?.map((p: { id: number; invoiceNumber: string; date: string; total: number; status: string; supplier: { name: string } }) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-mono text-xs font-medium">{p.invoiceNumber}</p>
                  <p className="text-muted-foreground">{p.supplier.name} • {format(new Date(p.date), "dd MMM yyyy", { locale: localeId })}</p>
                  {p.status === "RETURNED" && <p className="text-xs text-destructive">Diretur</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(p.total)}</span>
                  {p.status === "COMPLETED" && (
                    <Button variant="outline" size="sm" onClick={() => returnPurchase(p.id)} title="Retur">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
