import { PageHeader } from "@/components/shared/page-header";
import { CategoriesTable } from "@/components/categories/categories-table";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Kategori Produk" description="Kelola kategori plastik dan bahan kue" />
      <CategoriesTable />
    </div>
  );
}
