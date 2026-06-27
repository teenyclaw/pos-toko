import { PageHeader } from "@/components/shared/page-header";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pembelian" description="Input pembelian barang dan update stok otomatis" />
      <PurchaseForm />
    </div>
  );
}
