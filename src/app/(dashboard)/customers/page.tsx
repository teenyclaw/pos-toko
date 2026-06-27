import { PageHeader } from "@/components/shared/page-header";
import { CustomersTable } from "@/components/customers/customers-table";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan"
        description="Kelola data pelanggan, poin member, hutang, dan riwayat pembelian"
      />
      <CustomersTable />
    </div>
  );
}
