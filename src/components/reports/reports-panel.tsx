"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { exportToExcel, exportToPdf } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ReportTab = "sales" | "purchases" | "best-sellers" | "low-stock";

export function ReportsPanel() {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", tab, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ type: tab, from, to });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return res.json();
    },
  });

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "sales", label: "Penjualan" },
    { id: "purchases", label: "Pembelian" },
    { id: "best-sellers", label: "Terlaris" },
    { id: "low-stock", label: "Stok Menipis" },
  ];

  const handleExportExcel = () => {
    if (!data?.data?.length) return;
    if (tab === "sales") {
      exportToExcel(
        `laporan-penjualan-${from}`,
        "Penjualan",
        data.data.map((r: { invoiceNumber: string; date: string; customer: string; total: number; paymentMethod: string }) => ({
          Invoice: r.invoiceNumber,
          Tanggal: format(new Date(r.date), "dd/MM/yyyy HH:mm"),
          Pelanggan: r.customer,
          Metode: PAYMENT_METHOD_LABELS[r.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? r.paymentMethod,
          Total: r.total,
        }))
      );
    } else if (tab === "purchases") {
      exportToExcel(
        `laporan-pembelian-${from}`,
        "Pembelian",
        data.data.map((r: { invoiceNumber: string; date: string; supplier: string; total: number }) => ({
          Invoice: r.invoiceNumber,
          Tanggal: format(new Date(r.date), "dd/MM/yyyy"),
          Supplier: r.supplier,
          Total: r.total,
        }))
      );
    } else if (tab === "best-sellers") {
      exportToExcel(
        `produk-terlaris-${from}`,
        "Terlaris",
        data.data.map((r: { name: string; qty: number; total: number }) => ({
          Produk: r.name,
          "Qty Terjual": r.qty,
          "Total Penjualan": r.total,
        }))
      );
    } else {
      exportToExcel(
        "stok-menipis",
        "Stok Menipis",
        data.data.map((r: { code: string; name: string; stock: number; minStock: number; unit: string }) => ({
          Kode: r.code,
          Produk: r.name,
          Stok: r.stock,
          "Min Stok": r.minStock,
          Satuan: r.unit,
        }))
      );
    }
  };

  const handleExportPdf = () => {
    if (!data?.data?.length) return;
    if (tab === "sales") {
      exportToPdf(
        `laporan-penjualan-${from}`,
        "Laporan Penjualan",
        ["Invoice", "Tanggal", "Pelanggan", "Total"],
        data.data.map((r: { invoiceNumber: string; date: string; customer: string; total: number }) => [
          r.invoiceNumber,
          format(new Date(r.date), "dd/MM/yy HH:mm"),
          r.customer,
          formatCurrency(r.total),
        ]),
        data.summary
          ? [
              `Periode: ${from} s/d ${to}`,
              `Total Transaksi: ${data.summary.totalTransactions}`,
              `Total Omzet: ${formatCurrency(data.summary.totalRevenue)}`,
            ]
          : undefined
      );
    } else if (tab === "low-stock") {
      exportToPdf(
        "stok-menipis",
        "Laporan Stok Menipis",
        ["Kode", "Produk", "Stok", "Min"],
        data.data.map((r: { code: string; name: string; stock: number; minStock: number }) => [
          r.code,
          r.name,
          String(r.stock),
          String(r.minStock),
        ])
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => refetch()}>Terapkan Filter</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!data?.data?.length}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!data?.data?.length || tab === "purchases" || tab === "best-sellers"}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {data?.summary && tab === "sales" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Transaksi</p><p className="text-2xl font-bold">{data.summary.totalTransactions}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Omzet</p><p className="text-2xl font-bold text-primary">{formatCurrency(data.summary.totalRevenue)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pajak</p><p className="text-2xl font-bold">{formatCurrency(data.summary.totalTax)}</p></CardContent></Card>
        </div>
      )}

      {data?.summary && tab === "purchases" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Pembelian</p><p className="text-2xl font-bold">{formatCurrency(data.summary.totalPurchases)} ({data.summary.count} transaksi)</p></CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Data Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-muted-foreground">Memuat...</p>
            ) : tab === "sales" ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Tanggal</th><th className="px-4 py-2 text-left">Pelanggan</th><th className="px-4 py-2 text-left">Kasir</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {data?.data?.map((r: { invoiceNumber: string; date: string; customer: string; cashier: string; total: number }, i: number) => (
                    <tr key={i} className="border-b"><td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber}</td><td className="px-4 py-2">{format(new Date(r.date), "dd/MM/yy HH:mm", { locale: localeId })}</td><td className="px-4 py-2">{r.customer}</td><td className="px-4 py-2">{r.cashier}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(r.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : tab === "purchases" ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Tanggal</th><th className="px-4 py-2 text-left">Supplier</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {data?.data?.map((r: { invoiceNumber: string; date: string; supplier: string; total: number }, i: number) => (
                    <tr key={i} className="border-b"><td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber}</td><td className="px-4 py-2">{format(new Date(r.date), "dd/MM/yyyy", { locale: localeId })}</td><td className="px-4 py-2">{r.supplier}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(r.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : tab === "best-sellers" ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">Produk</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {data?.data?.map((r: { name: string; qty: number; total: number }, i: number) => (
                    <tr key={i} className="border-b"><td className="px-4 py-2">{i + 1}</td><td className="px-4 py-2 font-medium">{r.name}</td><td className="px-4 py-2 text-right">{r.qty}</td><td className="px-4 py-2 text-right">{formatCurrency(r.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left">Kode</th><th className="px-4 py-2 text-left">Produk</th><th className="px-4 py-2 text-right">Stok</th><th className="px-4 py-2 text-right">Min</th><th className="px-4 py-2 text-left">Status</th></tr></thead>
                <tbody>
                  {data?.data?.map((r: { id: number; code: string; name: string; stock: number; minStock: number; unit: string }) => (
                    <tr key={r.id} className="border-b"><td className="px-4 py-2">{r.code}</td><td className="px-4 py-2">{r.name}</td><td className="px-4 py-2 text-right">{r.stock} {r.unit}</td><td className="px-4 py-2 text-right">{r.minStock}</td><td className="px-4 py-2"><Badge variant="warning">Menipis</Badge></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
