import { PageHeader } from "@/components/shared/page-header";
import { PosInterface } from "@/components/pos/pos-interface";

export default function PosPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Kasir POS" description="Transaksi penjualan dengan scan barcode" />
      <PosInterface />
    </div>
  );
}
