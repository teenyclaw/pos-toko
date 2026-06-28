"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function FinancePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collectType, setCollectType] = useState<"customer" | "supplier">("customer");
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "QRIS" | "TRANSFER">("CASH");

  const { data, isLoading } = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const res = await fetch("/api/finance");
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const collectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/finance/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(collectType === "customer" ? { customerId: parseInt(partyId, 10) } : { supplierId: parseInt(partyId, 10) }),
          amount: parseFloat(amount),
          method,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Berhasil", description: "Pelunasan berhasil dicatat" });
      setAmount("");
      setPartyId("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <ArrowDownCircle className="h-10 w-10 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Piutang Pelanggan</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalReceivables)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <ArrowUpCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Total Hutang Supplier</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPayables)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Catat Pelunasan</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Jenis</Label>
            <select
              value={collectType}
              onChange={(e) => { setCollectType(e.target.value as "customer" | "supplier"); setPartyId(""); }}
              className="flex h-10 rounded-md border px-3 text-sm"
            >
              <option value="customer">Piutang Pelanggan</option>
              <option value="supplier">Hutang Supplier</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>{collectType === "customer" ? "Pelanggan" : "Supplier"}</Label>
            <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="flex h-10 min-w-[200px] rounded-md border px-3 text-sm">
              <option value="">Pilih...</option>
              {(collectType === "customer" ? data.receivables : data.payables).map((p: { id: number; name: string; balance: number }) => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.balance)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Nominal</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-2">
            <Label>Metode</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="flex h-10 rounded-md border px-3 text-sm">
              <option value="CASH">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <Button onClick={() => collectMutation.mutate()} disabled={!partyId || !amount || collectMutation.isPending}>
            <Wallet className="h-4 w-4" /> Catat Pelunasan
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Piutang Pelanggan</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Nama</th><th className="px-4 py-2 text-right">Hutang</th></tr></thead>
              <tbody>
                {data.receivables.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">Tidak ada piutang</td></tr>
                ) : data.receivables.map((c: { id: number; name: string; balance: number }) => (
                  <tr key={c.id} className="border-b"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right font-medium text-destructive">{formatCurrency(c.balance)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Hutang Supplier</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Nama</th><th className="px-4 py-2 text-right">Hutang</th></tr></thead>
              <tbody>
                {data.payables.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">Tidak ada hutang</td></tr>
                ) : data.payables.map((s: { id: number; name: string; balance: number }) => (
                  <tr key={s.id} className="border-b"><td className="px-4 py-2">{s.name}</td><td className="px-4 py-2 text-right font-medium text-destructive">{formatCurrency(s.balance)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {data.recentPayments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Riwayat Pembayaran Terakhir</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Tanggal</th><th className="px-4 py-2 text-left">Pihak</th><th className="px-4 py-2 text-left">Metode</th><th className="px-4 py-2 text-right">Nominal</th></tr></thead>
              <tbody>
                {data.recentPayments.map((p: { id: number; date: string; party: string; method: string; amount: number }) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2">{format(new Date(p.date), "dd/MM/yy HH:mm", { locale: localeId })}</td>
                    <td className="px-4 py-2">{p.party}</td>
                    <td className="px-4 py-2"><Badge variant="secondary">{PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}</Badge></td>
                    <td className="px-4 py-2 text-right">{formatCurrency(Math.abs(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
