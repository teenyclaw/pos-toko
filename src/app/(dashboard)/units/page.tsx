import { PageHeader } from "@/components/shared/page-header";
import { UnitsTable } from "@/components/units/units-table";

export default function UnitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Satuan" description="Kelola satuan produk (Pcs, Kg, Pack, Dus, dll)" />
      <UnitsTable />
    </div>
  );
}
