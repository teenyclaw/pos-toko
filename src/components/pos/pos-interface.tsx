"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Trash2,
  Pause,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  Clock,
  Printer,
  History,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { HeldSalesPanel } from "@/components/pos/held-sales-panel";
import { formatCurrency } from "@/lib/utils";
import { printReceipt } from "@/lib/receipt";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { ReceiptData } from "@/types/receipt";
import type { HeldCartData } from "@/types/held-sale";

interface CartItem {
  productId: number;
  unitId: number;
  name: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  stock: number;
}

interface ProductSearch {
  id: number;
  name: string;
  barcode: string | null;
  code: string;
  sellPrice: number;
  stock: number;
  baseUnitId: number;
  baseUnit: { id: number; name: string; abbreviation: string };
  unitPrices: Array<{ unitId: number; sellPrice: number; unit: { id: number; name: string; abbreviation: string } }>;
}

interface RecentSale {
  id: number;
  invoiceNumber: string;
  date: string;
  total: number;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS;
}

export function PosInterface() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactionDiscount, setTransactionDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(11);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS" | "TRANSFER" | "TEMPO">("CASH");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdLabel, setHoldLabel] = useState("");
  const [unitPickerProduct, setUnitPickerProduct] = useState<ProductSearch | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (settings?.default_tax) {
      setTaxPercent(Number(settings.default_tax) || 11);
    }
  }, [settings]);

  const { data: searchResults } = useQuery({
    queryKey: ["pos-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return { data: [] };
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(search)}`);
      return res.json();
    },
    enabled: search.length >= 2,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-pos"],
    queryFn: async () => (await fetch("/api/customers?limit=100")).json(),
  });

  const { data: recentSales, refetch: refetchSales } = useQuery({
    queryKey: ["sales-today"],
    queryFn: async () => {
      const res = await fetch("/api/sales?today=true&limit=10");
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      return res.json();
    },
  });

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice - i.discount, 0);
  const tax = Math.round(subtotal * (taxPercent / 100));
  const total = subtotal - transactionDiscount + tax;
  const change = paymentMethod === "TEMPO" ? 0 : paid - total;

  const addToCart = useCallback((product: ProductSearch, unitId?: number) => {
    const unit = unitId
      ? product.unitPrices.find((up) => up.unitId === unitId)?.unit ?? product.baseUnit
      : product.baseUnit;
    const price = unitId
      ? Number(product.unitPrices.find((up) => up.unitId === unitId)?.sellPrice ?? product.sellPrice)
      : Number(product.sellPrice);

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.unitId === unit.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.unitId === unit.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          unitId: unit.id,
          name: product.name,
          unitName: unit.abbreviation,
          quantity: 1,
          unitPrice: price,
          discount: 0,
          stock: Number(product.stock),
        },
      ];
    });
    setSearch("");
    toast({ title: "Ditambahkan", description: product.name });
  }, [toast]);

  const handleBarcode = async () => {
    if (!barcode) return;
    const res = await fetch(`/api/products/search?barcode=${encodeURIComponent(barcode)}`);
    const data = await res.json();
    if (data.data?.[0]) {
      addToCart(data.data[0]);
      setBarcode("");
    } else {
      toast({ title: "Tidak ditemukan", description: "Barcode tidak terdaftar", variant: "destructive" });
    }
  };

  const handleProductClick = (product: ProductSearch) => {
    const extraUnits = product.unitPrices?.filter((up) => up.unitId !== product.baseUnitId) ?? [];
    if (extraUnits.length > 0) {
      setUnitPickerProduct(product);
    } else {
      addToCart(product);
    }
  };

  const returnSale = async (saleId: number) => {
    if (!window.confirm("Retur transaksi ini? Stok akan dikembalikan.")) return;
    const res = await fetch(`/api/sales/${saleId}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Gagal", description: err.error ?? "Retur gagal", variant: "destructive" });
      return;
    }
    toast({ title: "Berhasil", description: "Retur penjualan berhasil" });
    refetchSales();
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const reprintSale = async (saleId: number) => {
    const res = await fetch(`/api/sales/${saleId}`);
    if (!res.ok) {
      toast({ title: "Error", description: "Gagal memuat struk", variant: "destructive" });
      return;
    }
    const data = await res.json();
    setAutoPrint(false);
    setReceiptData(data.receipt);
  };

  const buildCartPayload = () => ({
    items: cart,
    transactionDiscount,
    taxPercent,
    paid,
    paymentMethod,
    customerId,
  });

  const holdMutation = useMutation({
    mutationFn: async (label?: string) => {
      const res = await fetch("/api/held-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || undefined,
          customerId: paymentMethod === "TEMPO" ? customerId : null,
          cartData: buildCartPayload(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menahan transaksi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Transaksi ditahan", description: data.label ?? `Hold #${data.id}` });
      setCart([]);
      setPaid(0);
      setTransactionDiscount(0);
      setCustomerId(null);
      setHoldLabel("");
      setShowHoldDialog(false);
      queryClient.invalidateQueries({ queryKey: ["held-sales"] });
      barcodeRef.current?.focus();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const applyHeldCart = (cartData: HeldCartData) => {
    setCart(cartData.items);
    setTransactionDiscount(cartData.transactionDiscount);
    setTaxPercent(cartData.taxPercent);
    setPaid(cartData.paid);
    setPaymentMethod(cartData.paymentMethod);
    setCustomerId(cartData.customerId);
  };

  const handleRestoreHeld = async (cartData: HeldCartData, heldId: number) => {
    if (cart.length > 0) {
      const ok = window.confirm("Keranjang saat ini tidak kosong. Ganti dengan transaksi ditahan?");
      if (!ok) return;
    }
    applyHeldCart(cartData);
    await fetch(`/api/held-sales/${heldId}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["held-sales"] });
    toast({ title: "Transaksi dilanjutkan", description: "Keranjang dipulihkan dari hold" });
    barcodeRef.current?.focus();
  };

  const handleDeleteHeld = async (heldId: number) => {
    if (!window.confirm("Hapus transaksi ditahan ini?")) return;
    const res = await fetch(`/api/held-sales/${heldId}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["held-sales"] });
    toast({ title: "Dihapus", description: "Transaksi ditahan dihapus" });
  };

  const openHoldDialog = useCallback(() => {
    if (cart.length === 0) {
      toast({ title: "Keranjang kosong", description: "Tidak ada item untuk ditahan", variant: "destructive" });
      return;
    }
    const defaultLabel = paymentMethod === "TEMPO" && customerId
      ? customers?.data?.find((c: { id: number; name: string }) => c.id === customerId)?.name
      : `Hold ${format(new Date(), "HH:mm", { locale: localeId })}`;
    setHoldLabel(defaultLabel ?? "");
    setShowHoldDialog(true);
  }, [cart.length, paymentMethod, customerId, customers?.data, toast]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: paymentMethod === "TEMPO" ? customerId : null,
          items: cart.map((i) => ({
            productId: i.productId,
            unitId: i.unitId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          })),
          transactionDiscount,
          tax,
          paid: paymentMethod === "TEMPO" ? 0 : paid || total,
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Checkout gagal");
      }
      return res.json();
    },
    onSuccess: (sale) => {
      toast({ title: "Transaksi berhasil", description: `Invoice: ${sale.invoiceNumber}` });
      setCart([]);
      setPaid(0);
      setTransactionDiscount(0);
      setCustomerId(null);
      setAutoPrint(true);
      setReceiptData(sale.receipt);
      refetchSales();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      barcodeRef.current?.focus();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === "F3" && cart.length > 0) { e.preventDefault(); openHoldDialog(); }
      if (e.key === "F4" && cart.length > 0) { e.preventDefault(); checkoutMutation.mutate(); }
      if (e.key === "F6" && receiptData) { e.preventDefault(); printReceipt(receiptData); }
      if (e.key === "Escape") {
        if (showHoldDialog) { setShowHoldDialog(false); return; }
        if (receiptData) { setReceiptData(null); return; }
        e.preventDefault();
        setCart([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, checkoutMutation, receiptData, showHoldDialog, openHoldDialog]);

  return (
    <>
      <ReceiptDialog
        data={receiptData}
        onClose={() => setReceiptData(null)}
        autoPrint={autoPrint}
      />

      {showHoldDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pause className="h-5 w-5" />
                Tahan Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simpan keranjang ({cart.length} item, {formatCurrency(total)}) untuk dilanjutkan nanti.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Label (opsional)</label>
                <Input
                  value={holdLabel}
                  onChange={(e) => setHoldLabel(e.target.value)}
                  placeholder="Contoh: Pelanggan Pak Budi"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") holdMutation.mutate(holdLabel || undefined);
                    if (e.key === "Escape") setShowHoldDialog(false);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={holdMutation.isPending}
                  onClick={() => holdMutation.mutate(holdLabel || undefined)}
                >
                  <Pause className="h-4 w-4" /> Simpan Hold
                </Button>
                <Button variant="outline" onClick={() => setShowHoldDialog(false)}>Batal</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid h-[calc(100vh-8rem)] gap-4 lg:grid-cols-3">
        <div className="space-y-4 overflow-y-auto lg:col-span-2">
          <HeldSalesPanel onRestore={handleRestoreHeld} onDelete={handleDeleteHeld} />
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari produk (F2 untuk barcode)..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Input ref={barcodeRef} placeholder="Scan barcode..." value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleBarcode()} />
                <Button onClick={handleBarcode}>Scan</Button>
              </div>
            </CardContent>
          </Card>

          {searchResults?.data?.length > 0 && (
            <Card>
              <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
                {searchResults.data.map((p: ProductSearch) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductClick(p)}
                    className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code} • Stok: {Number(p.stock)} {p.baseUnit.abbreviation}</p>
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(Number(p.sellPrice))}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {unitPickerProduct && (
            <Card className="border-primary">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Pilih Satuan — {unitPickerProduct.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pb-4">
                <Button size="sm" onClick={() => { addToCart(unitPickerProduct); setUnitPickerProduct(null); }}>
                  {unitPickerProduct.baseUnit.name} — {formatCurrency(Number(unitPickerProduct.sellPrice))}
                </Button>
                {unitPickerProduct.unitPrices.filter((up) => up.unitId !== unitPickerProduct.baseUnitId).map((up) => (
                  <Button key={up.unitId} size="sm" variant="outline" onClick={() => { addToCart(unitPickerProduct, up.unitId); setUnitPickerProduct(null); }}>
                    {up.unit.name} — {formatCurrency(Number(up.sellPrice))}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setUnitPickerProduct(null)}>Batal</Button>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1">
            <CardHeader><CardTitle>Keranjang ({cart.length})</CardTitle></CardHeader>
            <CardContent className="max-h-72 space-y-2 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Keranjang kosong. Scan atau cari produk.</p>
              ) : (
                cart.map((item, idx) => (
                  <div key={`${item.productId}-${item.unitId}`} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} / {item.unitName}</p>
                    </div>
                    <Input type="number" className="w-20" value={item.quantity} min={1} onChange={(e) => {
                      const qty = parseInt(e.target.value, 10) || 1;
                      setCart(cart.map((c, i) => i === idx ? { ...c, quantity: qty } : c));
                    }} />
                    <span className="w-24 text-right font-semibold">{formatCurrency(item.quantity * item.unitPrice - item.discount)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setCart(cart.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Transaksi Hari Ini
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? "Sembunyikan" : "Tampilkan"}
              </Button>
            </CardHeader>
            {showHistory && (
              <CardContent className="space-y-2 pt-0">
                {(recentSales?.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada transaksi hari ini</p>
                ) : (
                  recentSales?.data?.map((sale: RecentSale) => (
                    <div key={sale.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <div>
                        <p className="font-mono text-xs font-medium">{sale.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.date), "HH:mm", { locale: localeId })} • {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(sale.total)}</span>
                        <Button variant="outline" size="sm" onClick={() => reprintSale(sale.id)}>
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => returnSale(sale.id)} title="Retur">
                          <RotateCcw className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader><CardTitle>Pembayaran</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span>Diskon</span>
                <Input type="number" className="h-8 w-28 text-right" value={transactionDiscount} onChange={(e) => setTransactionDiscount(Number(e.target.value))} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Pajak ({taxPercent}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "QRIS", "TRANSFER", "TEMPO"] as const).map((m) => (
                <Button key={m} variant={paymentMethod === m ? "default" : "outline"} size="sm" onClick={() => setPaymentMethod(m)}>
                  {m === "CASH" && <Banknote className="h-4 w-4" />}
                  {m === "QRIS" && <QrCode className="h-4 w-4" />}
                  {m === "TRANSFER" && <Building2 className="h-4 w-4" />}
                  {m === "TEMPO" && <Clock className="h-4 w-4" />}
                  {PAYMENT_METHOD_LABELS[m]}
                </Button>
              ))}
            </div>

            {paymentMethod === "TEMPO" && (
              <select className="h-10 rounded-md border px-3 text-sm" value={customerId ?? ""} onChange={(e) => setCustomerId(Number(e.target.value) || null)}>
                <option value="">Pilih pelanggan</option>
                {customers?.data?.map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {paymentMethod !== "TEMPO" && (
              <>
                <Input type="number" placeholder="Bayar" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} />
                {paid > 0 && <p className="text-sm">Kembalian: <span className="font-bold">{formatCurrency(change)}</span></p>}
              </>
            )}

            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="autoPrint"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="autoPrint">Cetak struk otomatis setelah bayar</label>
            </div>

            <div className="mt-auto space-y-2">
              <Button className="w-full" size="lg" disabled={cart.length === 0 || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate()}>
                <CreditCard className="h-4 w-4" /> Bayar & Cetak (F4)
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={cart.length === 0 || holdMutation.isPending}
                onClick={openHoldDialog}
              >
                <Pause className="h-4 w-4" /> Tahan Transaksi (F3)
              </Button>
              {receiptData && (
                <Button variant="secondary" className="w-full" onClick={() => printReceipt(receiptData)}>
                  <Printer className="h-4 w-4" /> Cetak Ulang Struk (F6)
                </Button>
              )}
              <Button variant="outline" className="w-full" disabled={cart.length === 0} onClick={() => setCart([])}>
                <RotateCcw className="h-4 w-4" /> Kosongkan Keranjang (Esc)
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              <p>F2 = Barcode | F3 = Hold | F4 = Bayar | F6 = Cetak | Esc = Batal/Bersihkan</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
