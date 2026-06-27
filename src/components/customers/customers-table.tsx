"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Eye, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { customerSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type CustomerForm = z.infer<typeof customerSchema>;

interface Customer {
  id: number;
  name: string;
  whatsapp: string | null;
  address: string | null;
  points: number;
  creditLimit: number;
  balance: number;
  _count?: { sales: number };
}

interface CustomerDetail extends Customer {
  sales: Array<{
    id: number;
    invoiceNumber: string;
    date: string;
    total: number;
    paymentMethod: keyof typeof PAYMENT_METHOD_LABELS;
    status: string;
  }>;
}

export function CustomersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: { creditLimit: 0, points: 0 },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10", search });
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error("Gagal memuat pelanggan");
      return res.json();
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<CustomerDetail>({
    queryKey: ["customer-detail", viewId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${viewId}`);
      if (!res.ok) throw new Error("Gagal memuat detail");
      return res.json();
    },
    enabled: viewId !== null,
  });

  const mutation = useMutation({
    mutationFn: async (payload: CustomerForm & { id?: number }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/customers/${payload.id}` : "/api/customers";
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (viewId) queryClient.invalidateQueries({ queryKey: ["customer-detail", viewId] });
      toast({ title: "Berhasil", description: "Data pelanggan disimpan" });
      reset({ creditLimit: 0, points: 0 });
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menghapus");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Berhasil", description: "Pelanggan dihapus" });
      if (viewId) setViewId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditId(null);
    reset({ creditLimit: 0, points: 0 });
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditId(customer.id);
    setValue("name", customer.name);
    setValue("whatsapp", customer.whatsapp ?? "");
    setValue("address", customer.address ?? "");
    setValue("creditLimit", customer.creditLimit);
    setValue("points", customer.points);
    setShowForm(true);
  };

  const whatsappLink = (phone: string | null) => {
    if (!phone) return null;
    const normalized = phone.replace(/\D/g, "");
    return `https://wa.me/${normalized.startsWith("0") ? `62${normalized.slice(1)}` : normalized}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama, WhatsApp, alamat..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Pelanggan</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editId ? "Edit Pelanggan" : "Tambah Pelanggan"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-2">
                <Label>Nama *</Label>
                <Input {...register("name")} placeholder="Nama pelanggan" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input {...register("whatsapp")} placeholder="6281234567890" />
              </div>
              <div className="space-y-2">
                <Label>Limit Kredit (Rp)</Label>
                <Input type="number" {...register("creditLimit")} />
              </div>
              <div className="space-y-2">
                <Label>Poin Member</Label>
                <Input type="number" {...register("points")} />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Alamat</Label>
                <textarea
                  {...register("address")}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Alamat lengkap"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
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
            <CardTitle className="text-lg">Detail Pelanggan</CardTitle>
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
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    {detail.whatsapp ? (
                      <a href={whatsappLink(detail.whatsapp)!} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-primary hover:underline">
                        <MessageCircle className="h-3 w-3" />{detail.whatsapp}
                      </a>
                    ) : "-"}
                  </div>
                  <div><p className="text-xs text-muted-foreground">Poin</p><p className="font-medium">{detail.points}</p></div>
                  <div><p className="text-xs text-muted-foreground">Hutang</p><p className="font-bold text-destructive">{formatCurrency(detail.balance)}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Alamat</p><p>{detail.address || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Limit Kredit</p><p>{formatCurrency(detail.creditLimit)}</p></div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Riwayat Pembelian ({detail._count?.sales ?? detail.sales.length})</h4>
                  {detail.sales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left">Invoice</th>
                            <th className="px-3 py-2 text-left">Tanggal</th>
                            <th className="px-3 py-2 text-left">Metode</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.sales.map((sale) => (
                            <tr key={sale.id} className="border-b">
                              <td className="px-3 py-2 font-mono text-xs">{sale.invoiceNumber}</td>
                              <td className="px-3 py-2">{format(new Date(sale.date), "dd MMM yyyy HH:mm", { locale: localeId })}</td>
                              <td className="px-3 py-2">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatCurrency(sale.total)}</td>
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
                  <th className="px-4 py-3 text-left font-medium">Pelanggan</th>
                  <th className="px-4 py-3 text-left font-medium">WhatsApp</th>
                  <th className="px-4 py-3 text-right font-medium">Poin</th>
                  <th className="px-4 py-3 text-right font-medium">Hutang</th>
                  <th className="px-4 py-3 text-right font-medium">Transaksi</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada pelanggan</td></tr>
                ) : (
                  data?.data?.map((customer: Customer) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{customer.name}</p>
                        {customer.address && <p className="max-w-xs truncate text-xs text-muted-foreground">{customer.address}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {customer.whatsapp ? (
                          <a href={whatsappLink(customer.whatsapp)!} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {customer.whatsapp}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">{customer.points}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(customer.balance) > 0 ? (
                          <Badge variant="warning">{formatCurrency(customer.balance)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{formatCurrency(0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{customer._count?.sales ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Detail" onClick={() => setViewId(customer.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(customer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Hapus" onClick={() => deleteMutation.mutate(customer.id)}>
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
                Halaman {data.meta.page} dari {data.meta.totalPages} ({data.meta.total} pelanggan)
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
