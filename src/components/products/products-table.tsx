"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Barcode, Pencil, Printer, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productWithUnitsSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { printBarcodeLabels } from "@/lib/barcode-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type ProductForm = z.infer<typeof productWithUnitsSchema>;

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
  baseUnit: { id: number; abbreviation: string; name: string };
  supplier: { name: string } | null;
}

interface UnitPriceRow { unitId: number; sellPrice: number }
interface ConversionRow { fromUnitId: number; toUnitId: number; factor: number }

export function ProductsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [unitPrices, setUnitPrices] = useState<UnitPriceRow[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productWithUnitsSchema),
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
    mutationFn: async (payload: ProductForm & { id?: number }) => {
      const url = payload.id ? `/api/products/${payload.id}` : "/api/products";
      const { id, ...body } = payload;
      const res = await fetch(url, {
        method: payload.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, unitPrices, conversions }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Berhasil", description: editId ? "Produk diperbarui" : "Produk ditambahkan" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menonaktifkan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Berhasil", description: "Produk dinonaktifkan" });
    },
  });

  const closeForm = () => {
    reset({ isActive: true, stock: 0, minStock: 5, buyPrice: 0, sellPrice: 0 });
    setUnitPrices([]);
    setConversions([]);
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = async (id: number) => {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) return;
    const product = await res.json();
    setEditId(id);
    setValue("code", product.code);
    setValue("barcode", product.barcode ?? "");
    setValue("name", product.name);
    setValue("categoryId", product.categoryId);
    setValue("baseUnitId", product.baseUnitId);
    setValue("supplierId", product.supplierId);
    setValue("buyPrice", Number(product.buyPrice));
    setValue("sellPrice", Number(product.sellPrice));
    setValue("stock", Number(product.stock));
    setValue("minStock", Number(product.minStock));
    setValue("isActive", product.isActive);
    setUnitPrices(product.unitPrices?.map((up: { unitId: number; sellPrice: unknown }) => ({
      unitId: up.unitId,
      sellPrice: Number(up.sellPrice),
    })) ?? []);
    setConversions(product.conversions?.map((c: { fromUnitId: number; toUnitId: number; factor: unknown }) => ({
      fromUnitId: c.fromUnitId,
      toUnitId: c.toUnitId,
      factor: Number(c.factor),
    })) ?? []);
    setShowForm(true);
  };

  const handlePrintLabels = () => {
    const products = (data?.data as Product[] ?? []).filter((p) => selectedIds.includes(p.id));
    if (products.length === 0) {
      toast({ title: "Pilih produk", description: "Centang produk yang ingin dicetak labelnya", variant: "destructive" });
      return;
    }
    printBarcodeLabels(products.map((p) => ({
      name: p.name,
      code: p.code,
      barcode: p.barcode ?? p.code,
      price: Number(p.sellPrice),
      unit: p.baseUnit.abbreviation,
    })));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari produk, kode, barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintLabels}><Printer className="h-4 w-4" /> Cetak Label</Button>
          <Button onClick={() => { closeForm(); setShowForm(true); }}><Plus className="h-4 w-4" /> Tambah Produk</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, id: editId ?? undefined }))} className="contents">
              <div className="space-y-2"><Label>Kode</Label><Input {...register("code")} />{errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}</div>
              <div className="space-y-2"><Label>Barcode</Label><Input {...register("barcode")} placeholder="Auto generate" /></div>
              <div className="space-y-2"><Label>Nama Produk</Label><Input {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Kategori</Label><select {...register("categoryId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Pilih...</option>{categories?.data?.map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Satuan Dasar</Label><select {...register("baseUnitId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Pilih...</option>{units?.data?.map((u: { id: number; name: string }) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Supplier</Label><select {...register("supplierId")} className="flex h-10 w-full rounded-md border px-3 text-sm"><option value="">Opsional</option>{suppliers?.data?.map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Harga Beli</Label><Input type="number" {...register("buyPrice")} /></div>
              <div className="space-y-2"><Label>Harga Jual (satuan dasar)</Label><Input type="number" {...register("sellPrice")} /></div>
              {!editId && <div className="space-y-2"><Label>Stok Awal</Label><Input type="number" step="0.001" {...register("stock")} /></div>}
              <div className="space-y-2"><Label>Min Stok</Label><Input type="number" step="0.001" {...register("minStock")} /></div>

              <div className="sm:col-span-2 lg:col-span-3 space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Harga per Satuan Lain</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setUnitPrices([...unitPrices, { unitId: 0, sellPrice: 0 }])}>+ Satuan</Button>
                </div>
                {unitPrices.map((up, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={up.unitId || ""} onChange={(e) => { const n = [...unitPrices]; n[i].unitId = parseInt(e.target.value, 10); setUnitPrices(n); }} className="flex h-10 flex-1 rounded-md border px-3 text-sm">
                      <option value="">Satuan...</option>
                      {units?.data?.map((u: { id: number; name: string }) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <Input type="number" placeholder="Harga jual" value={up.sellPrice || ""} onChange={(e) => { const n = [...unitPrices]; n[i].sellPrice = parseFloat(e.target.value) || 0; setUnitPrices(n); }} className="w-32" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setUnitPrices(unitPrices.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              <div className="sm:col-span-2 lg:col-span-3 space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Konversi Satuan</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setConversions([...conversions, { fromUnitId: 0, toUnitId: 0, factor: 1 }])}>+ Konversi</Button>
                </div>
                <p className="text-xs text-muted-foreground">Contoh: 1 Dus = 20 Pack → from=Dus, to=Pack, factor=20</p>
                {conversions.map((c, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <select value={c.fromUnitId || ""} onChange={(e) => { const n = [...conversions]; n[i].fromUnitId = parseInt(e.target.value, 10); setConversions(n); }} className="flex h-10 rounded-md border px-3 text-sm">
                      <option value="">Dari...</option>
                      {units?.data?.map((u: { id: number; name: string }) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <span className="self-center text-sm">→</span>
                    <select value={c.toUnitId || ""} onChange={(e) => { const n = [...conversions]; n[i].toUnitId = parseInt(e.target.value, 10); setConversions(n); }} className="flex h-10 rounded-md border px-3 text-sm">
                      <option value="">Ke...</option>
                      {units?.data?.map((u: { id: number; name: string }) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <Input type="number" step="0.000001" placeholder="Faktor" value={c.factor || ""} onChange={(e) => { const n = [...conversions]; n[i].factor = parseFloat(e.target.value) || 0; setConversions(n); }} className="w-24" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setConversions(conversions.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={mutation.isPending}>{editId ? "Perbarui" : "Simpan"}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
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
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (
                  data?.data?.map((p: Product) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
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
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p.id)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
