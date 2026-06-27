import { PageHeader } from "@/components/shared/page-header";
import { StockManager } from "@/components/stock/stock-manager";

export default function StockPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen Stok" description="Stok masuk, keluar, opname, dan riwayat mutasi" />
      <StockManager />
    </div>
  );
}
