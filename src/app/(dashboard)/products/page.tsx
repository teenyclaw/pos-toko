import { PageHeader } from "@/components/shared/page-header";
import { ProductsTable } from "@/components/products/products-table";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Produk" description="Kelola produk, barcode, harga, dan stok" />
      <ProductsTable />
    </div>
  );
}
