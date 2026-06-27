import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/users/users-table";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen User" description="Kelola akun Owner, Kasir, dan Gudang" />
      <UsersTable />
    </div>
  );
}
