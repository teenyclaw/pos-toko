"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unitSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type UnitForm = z.infer<typeof unitSchema>;

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

export function UnitsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(unitSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Gagal memuat satuan");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: UnitForm & { id?: number }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/units/${payload.id}` : "/api/units";
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
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "Berhasil", description: "Satuan disimpan" });
      reset();
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Gagal menghapus");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "Berhasil", description: "Satuan dihapus" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); reset(); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Satuan
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-6">
            <form onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))} className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Nama Satuan</Label>
                <Input {...register("name")} placeholder="Kilogram" />
                {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label>Singkatan</Label>
                <Input {...register("abbreviation")} placeholder="Kg" />
                {errors.abbreviation && <p className="text-sm text-destructive">{String(errors.abbreviation.message)}</p>}
              </div>
              <Button type="submit" disabled={mutation.isPending}>Simpan</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Singkatan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : (
                data?.data?.map((unit: Unit) => (
                  <tr key={unit.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{unit.name}</td>
                    <td className="px-4 py-3">{unit.abbreviation}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(unit.id); setValue("name", unit.name); setValue("abbreviation", unit.abbreviation); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(unit.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
