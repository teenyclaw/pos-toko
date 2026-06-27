import { PageHeader } from "@/components/shared/page-header";
import { ReportsPanel } from "@/components/reports/reports-panel";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Penjualan, pembelian, produk terlaris, stok menipis — export PDF & Excel" />
      <ReportsPanel />
    </div>
  );
}
