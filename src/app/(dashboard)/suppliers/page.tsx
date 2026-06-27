import { PageHeader } from "@/components/shared/page-header";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier"
        description="Kelola pemasok barang, kontak, dan riwayat pembelian"
      />
      <SuppliersTable />
    </div>
  );
}
