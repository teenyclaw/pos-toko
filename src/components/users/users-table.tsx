"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "@/lib/validations";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@prisma/client";
import type { z } from "zod";

type UserForm = z.infer<typeof userSchema>;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export function UsersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "KASIR", isActive: true },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Gagal memuat user");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: UserForm & { id?: string }) => {
      const method = payload.id ? "PUT" : "POST";
      const url = payload.id ? `/api/users/${payload.id}` : "/api/users";
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Berhasil", description: "User disimpan" });
      reset({ role: "KASIR", isActive: true });
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Gagal menghapus");
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Berhasil", description: body.message ?? "User dihapus" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (user: UserRow) => {
    setEditId(user.id);
    setValue("name", user.name);
    setValue("email", user.email);
    setValue("role", user.role);
    setValue("isActive", user.isActive);
    setValue("password", "");
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); reset({ role: "KASIR", isActive: true }); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <form onSubmit={handleSubmit((d) => mutation.mutate(editId ? { ...d, id: editId } : d))} className="contents">
              <div className="space-y-2"><Label>Nama</Label><Input {...register("name")} />{errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}</div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-sm text-destructive">{String(errors.email.message)}</p>}</div>
              <div className="space-y-2">
                <Label>Password {editId && "(kosongkan jika tidak diubah)"}</Label>
                <Input type="password" {...register("password")} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select {...register("role")} className="flex h-10 w-full rounded-md border px-3 text-sm">
                  <option value="OWNER">Owner</option>
                  <option value="KASIR">Kasir</option>
                  <option value="GUDANG">Gudang</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <input type="checkbox" id="userActive" {...register("isActive")} className="h-4 w-4" />
                <Label htmlFor="userActive">Aktif</Label>
              </div>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : (
                data?.data?.map((user: UserRow) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={user.isActive ? "success" : "outline"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(user.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
