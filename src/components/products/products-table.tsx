"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Barcode } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  category: { name: string };
  baseUnit: { abbreviation: string };
  supplier: { name: string } | null;
}

export function ProductsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { isActive: true, stock: 0, minStock: 5, buyPrice: 0, sellPrice: 0 },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await fetch("/api/categories")).json(),
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await fetch("/api/units")).json(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await fetch("/api/suppliers")).json(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10", search });
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Gagal memuat produk");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Berhasil", description: "Produk ditambahkan" });
      reset();
      setShowForm(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari produk, kode, barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Tambah Produk</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="contents">
              <div className="space-y-2"><Label>Kode</Label><Input {...register("code")} />{errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}</div>
              <div className="space-y-2"><Label>Barcode</Label><Input {...register("barcode")} placeholder="Auto generate" /></div>
              <div className="space-y-2"><Label>Nama Produk</Label><Input {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Kategori</Label><select {...register("categoryId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Pilih...</option>{categories?.data?.map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Satuan Dasar</Label><select {...register("baseUnitId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Pilih...</option>{units?.data?.map((u: { id: number; name: string }) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Supplier</Label><select {...register("supplierId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Opsional</option>{suppliers?.data?.map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Harga Beli</Label><Input type="number" {...register("buyPrice")} /></div>
              <div className="space-y-2"><Label>Harga Jual</Label><Input type="number" {...register("sellPrice")} /></div>
              <div className="space-y-2"><Label>Stok</Label><Input type="number" step="0.001" {...register("stock")} /></div>
              <div className="space-y-2"><Label>Min Stok</Label><Input type="number" step="0.001" {...register("minStock")} /></div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={mutation.isPending}>Simpan</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (
                  data?.data?.map((p: Product) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Barcode className="h-3 w-3" />{p.barcode ?? p.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">{p.category.name}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(p.sellPrice))}</td>
                      <td className="px-4 py-3 text-right">{Number(p.stock)} {p.baseUnit.abbreviation}</td>
                      <td className="px-4 py-3">
                        {Number(p.stock) <= Number(p.minStock) ? (
                          <Badge variant="warning">Menipis</Badge>
                        ) : p.isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Halaman {data.meta.page} dari {data.meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
