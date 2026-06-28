"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { expenseSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type ExpenseForm = z.infer<typeof expenseSchema>;

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
  userName: string;
}

export function ExpensesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd") },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await fetch(`/api/expenses?${params}`);
      if (!res.ok) throw new Error("Gagal memuat beban operasional");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ExpenseForm & { id?: number }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/expenses/${payload.id}` : "/api/expenses";
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
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Berhasil", description: editId ? "Beban diperbarui" : "Beban ditambahkan" });
      reset({ date: format(new Date(), "yyyy-MM-dd") });
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Berhasil", description: "Beban dihapus" });
    },
  });

  const onEdit = (expense: Expense) => {
    setEditId(expense.id);
    setValue("title", expense.title);
    setValue("amount", expense.amount);
    setValue("category", expense.category ?? "");
    setValue("date", format(new Date(expense.date), "yyyy-MM-dd"));
    setValue("notes", expense.notes ?? "");
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditId(null);
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Total beban: <span className="font-semibold text-foreground">{formatCurrency(data?.summary?.totalAmount ?? 0)}</span>
        </p>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> Tambah Beban
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input {...register("title")} placeholder="Contoh: Listrik bulan ini" />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input {...register("category")} placeholder="Listrik, sewa, gaji..." />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Catatan</Label>
                <Input {...register("notes")} placeholder="Opsional" />
              </div>
              <div className="flex items-end gap-2 lg:col-span-3">
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
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium">Judul</th>
                  <th className="px-4 py-3 text-left font-medium">Kategori</th>
                  <th className="px-4 py-3 text-right font-medium">Nominal</th>
                  <th className="px-4 py-3 text-left font-medium">Dicatat oleh</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (data?.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada beban operasional</td></tr>
                ) : (
                  data?.data.map((expense: Expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{format(new Date(expense.date), "dd MMM yyyy", { locale: localeId })}</td>
                      <td className="px-4 py-3 font-medium">{expense.title}</td>
                      <td className="px-4 py-3">{expense.category ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-3">{expense.userName}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(expense)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(expense.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(data?.meta?.totalPages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
          <span className="flex items-center text-sm text-muted-foreground">Halaman {page} / {data.meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
        </div>
      )}
    </div>
  );
}
