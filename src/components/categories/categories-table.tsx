"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type CategoryForm = z.infer<typeof categorySchema>;

interface Category {
  id: number;
  name: string;
  slug: string;
  type: "PLASTIK" | "BAHAN_KUE";
  _count?: { products: number };
}

export function CategoriesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: "PLASTIK" },
  });

  const { data, isLoading } = useQuery<{ data: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: CategoryForm & { id?: number }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/categories/${payload.id}` : "/api/categories";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Berhasil", description: "Kategori disimpan" });
      reset({ type: "PLASTIK" });
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Berhasil", description: "Kategori dihapus" });
    },
  });

  const onEdit = (cat: Category) => {
    setEditId(cat.id);
    setValue("name", cat.name);
    setValue("type", cat.type);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setEditId(null); reset({ type: "PLASTIK" }); }}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))}
              className="grid gap-4 sm:grid-cols-3"
            >
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input {...register("name")} placeholder="Contoh: Gula" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipe</Label>
                <select {...register("type")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="PLASTIK">Plastik</option>
                  <option value="BAHAN_KUE">Bahan Kue</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
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
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium">Produk</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (
                  data?.data.map((cat) => (
                    <tr key={cat.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cat.type === "PLASTIK" ? "default" : "secondary"}>
                          {cat.type === "PLASTIK" ? "Plastik" : "Bahan Kue"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{cat._count?.products ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
    </div>
  );
}
