import { PageHeader } from "@/components/shared/page-header";
import { ExpensesTable } from "@/components/expenses/expenses-table";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Beban Operasional" description="Kelola biaya operasional toko (listrik, sewa, gaji, dll)" />
      <ExpensesTable />
    </div>
  );
}
