import { PageHeader } from "@/components/shared/page-header";
import { FinancePanel } from "@/components/finance/finance-panel";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Piutang & Hutang" description="Kelola piutang pelanggan dan hutang ke supplier" />
      <FinancePanel />
    </div>
  );
}
