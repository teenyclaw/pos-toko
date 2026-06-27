"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { storeSettingSchema } from "@/lib/validations";
import { DEFAULT_STORE_SETTINGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type SettingsForm = z.infer<typeof storeSettingSchema>;

export function SettingsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return res.json();
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(storeSettingSchema),
    values: data
      ? {
          store_name: data.store_name ?? DEFAULT_STORE_SETTINGS.store_name,
          store_address: data.store_address ?? DEFAULT_STORE_SETTINGS.store_address,
          store_whatsapp: data.store_whatsapp ?? DEFAULT_STORE_SETTINGS.store_whatsapp,
          receipt_footer: data.receipt_footer ?? DEFAULT_STORE_SETTINGS.receipt_footer,
          default_tax: Number(data.default_tax ?? DEFAULT_STORE_SETTINGS.default_tax),
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (payload: SettingsForm) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          default_tax: String(payload.default_tax),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({ title: "Berhasil", description: "Pengaturan toko disimpan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Memuat pengaturan...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Toko</CardTitle>
        <CardDescription>Pengaturan ini digunakan pada struk dan tampilan aplikasi</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mx-auto max-w-2xl space-y-4">
          <div className="space-y-2">
            <Label>Nama Toko</Label>
            <Input {...register("store_name")} />
            {errors.store_name && <p className="text-sm text-destructive">{errors.store_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Alamat</Label>
            <textarea
              {...register("store_address")}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.store_address && <p className="text-sm text-destructive">{errors.store_address.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>WhatsApp Toko</Label>
              <Input {...register("store_whatsapp")} placeholder="6281234567890" />
              {errors.store_whatsapp && <p className="text-sm text-destructive">{errors.store_whatsapp.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Pajak Default (%)</Label>
              <Input type="number" step="0.1" {...register("default_tax")} />
              {errors.default_tax && <p className="text-sm text-destructive">{errors.default_tax.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Footer Struk</Label>
            <textarea
              {...register("receipt_footer")}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
