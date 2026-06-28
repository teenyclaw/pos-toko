"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Receipt,
  Calendar,
  AlertTriangle,
  CreditCard,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  monthlyRevenue: number;
  customerDebt: number;
  receivables: number;
  supplierDebt: number;
  lowStockProducts: Array<{ id: number; name: string; stock: number; minStock: number; unit: string }>;
  topProducts: Array<{ id: number; name: string; totalQty: number; totalSales: number }>;
  salesChart: Array<{ date: string; total: number }>;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Gagal memuat dashboard");
  return res.json();
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats });

  const chartData = {
    labels: data?.salesChart.map((d) => d.date) ?? [],
    datasets: [
      {
        label: "Penjualan (Rp)",
        data: data?.salesChart.map((d) => d.total) ?? [],
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan penjualan dan stok toko hari ini</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Penjualan Hari Ini" value={formatCurrency(data?.todaySales ?? 0)} icon={TrendingUp} description="Total omzet hari ini" />
        <StatCard title="Transaksi Hari Ini" value={String(data?.todayTransactions ?? 0)} icon={Receipt} description="Jumlah transaksi selesai" />
        <StatCard title="Omzet Bulan Ini" value={formatCurrency(data?.monthlyRevenue ?? 0)} icon={Calendar} description="Total penjualan bulan berjalan" />
        <StatCard title="Hutang Pelanggan" value={formatCurrency(data?.customerDebt ?? 0)} icon={CreditCard} description="Total piutang tempo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Grafik Penjualan</CardTitle>
            <CardDescription>7 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <Line
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatCurrency(Number(value)),
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stok Menipis
            </CardTitle>
            <CardDescription>Produk di bawah minimal stok</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.lowStockProducts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua stok aman</p>
            ) : (
              data?.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {p.stock} {p.unit} / Min: {p.minStock}
                    </p>
                  </div>
                  <Badge variant="warning">Menipis</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
            <CardDescription>Bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.topProducts ?? []).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.totalQty} terjual</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(p.totalSales)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Piutang & Hutang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Piutang Pelanggan</p>
                <p className="text-xl font-bold">{formatCurrency(data?.receivables ?? 0)}</p>
              </div>
              <Badge>Piutang</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Hutang ke Supplier</p>
                <p className="text-xl font-bold">{formatCurrency(data?.supplierDebt ?? 0)}</p>
              </div>
              <Badge variant="secondary">Hutang</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
