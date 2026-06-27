"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Eye, X, Phone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supplierSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type SupplierForm = z.infer<typeof supplierSchema>;

interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  address: string | null;
  isActive: boolean;
  _count?: { products: number; purchases: number };
}

interface SupplierDetail extends Supplier {
  products: Array<{ id: number; code: string; name: string; isActive: boolean }>;
  purchases: Array<{
    id: number;
    invoiceNumber: string;
    date: string;
    total: number;
    status: string;
  }>;
}

export function SuppliersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: { isActive: true },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10", search });
      const res = await fetch(`/api/suppliers?${params}`);
      if (!res.ok) throw new Error("Gagal memuat supplier");
      return res.json();
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<SupplierDetail>({
    queryKey: ["supplier-detail", viewId],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${viewId}`);
      if (!res.ok) throw new Error("Gagal memuat detail");
      return res.json();
    },
    enabled: viewId !== null,
  });

  const mutation = useMutation({
    mutationFn: async (payload: SupplierForm & { id?: number }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/suppliers/${payload.id}` : "/api/suppliers";
      const res = await fetch(url, {
        method,
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
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (viewId) queryClient.invalidateQueries({ queryKey: ["supplier-detail", viewId] });
      toast({ title: "Berhasil", description: "Data supplier disimpan" });
      reset({ isActive: true });
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Berhasil",
        description: data.message ?? "Supplier dihapus",
      });
      if (viewId) setViewId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditId(null);
    reset({ isActive: true });
    setShowForm(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditId(supplier.id);
    setValue("name", supplier.name);
    setValue("contact", supplier.contact ?? "");
    setValue("address", supplier.address ?? "");
    setValue("isActive", supplier.isActive);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama, kontak, alamat..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Supplier</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editId ? "Edit Supplier" : "Tambah Supplier"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label>Nama Supplier *</Label>
                <Input {...register("name")} placeholder="Nama supplier" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Kontak</Label>
                <Input {...register("contact")} placeholder="Nomor telepon / WhatsApp" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Alamat</Label>
                <textarea
                  {...register("address")}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Alamat supplier"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4 rounded border-input" />
                <Label htmlFor="isActive">Supplier aktif</Label>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={mutation.isPending}>Simpan</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {viewId && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detail Supplier</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setViewId(null)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <p className="text-muted-foreground">Memuat detail...</p>
            ) : detail ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Nama</p><p className="font-medium">{detail.name}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kontak</p>
                    <p className="flex items-center gap-1 font-medium">
                      <Phone className="h-3 w-3" />{detail.contact || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={detail.isActive ? "success" : "secondary"}>
                      {detail.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Produk Terhubung</p><p className="font-medium">{detail._count?.products ?? detail.products.length}</p></div>
                  <div className="sm:col-span-2 lg:col-span-4"><p className="text-xs text-muted-foreground">Alamat</p><p>{detail.address || "-"}</p></div>
                </div>

                {detail.products.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold">Produk dari Supplier</h4>
                    <div className="flex flex-wrap gap-2">
                      {detail.products.map((p) => (
                        <Badge key={p.id} variant="outline">{p.code} — {p.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 font-semibold">Riwayat Pembelian ({detail._count?.purchases ?? detail.purchases.length})</h4>
                  {detail.purchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada pembelian</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left">Invoice</th>
                            <th className="px-3 py-2 text-left">Tanggal</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.purchases.map((purchase) => (
                            <tr key={purchase.id} className="border-b">
                              <td className="px-3 py-2 font-mono text-xs">{purchase.invoiceNumber}</td>
                              <td className="px-3 py-2">{format(new Date(purchase.date), "dd MMM yyyy", { locale: localeId })}</td>
                              <td className="px-3 py-2"><Badge variant="outline">{purchase.status}</Badge></td>
                              <td className="px-3 py-2 text-right font-medium">{formatCurrency(purchase.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium">Kontak</th>
                  <th className="px-4 py-3 text-right font-medium">Produk</th>
                  <th className="px-4 py-3 text-right font-medium">Pembelian</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada supplier</td></tr>
                ) : (
                  data?.data?.map((supplier: Supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.address && <p className="max-w-xs truncate text-xs text-muted-foreground">{supplier.address}</p>}
                      </td>
                      <td className="px-4 py-3">{supplier.contact || "-"}</td>
                      <td className="px-4 py-3 text-right">{supplier._count?.products ?? 0}</td>
                      <td className="px-4 py-3 text-right">{supplier._count?.purchases ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={supplier.isActive ? "success" : "secondary"}>
                          {supplier.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Detail" onClick={() => setViewId(supplier.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(supplier)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Hapus" onClick={() => deleteMutation.mutate(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {data.meta.page} dari {data.meta.totalPages} ({data.meta.total} supplier)
              </p>
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
