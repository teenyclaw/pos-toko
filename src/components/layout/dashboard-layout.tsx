"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Ruler,
  Truck,
  Users,
  ShoppingBag,
  Warehouse,
  BarChart3,
  Settings,
  UserCog,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Store,
  Receipt,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@prisma/client";

const iconMap = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Ruler,
  Truck,
  Users,
  ShoppingBag,
  Warehouse,
  BarChart3,
  Settings,
  UserCog,
  Receipt,
  Wallet,
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = session?.user?.role as UserRole | undefined;
  const navItems = NAV_ITEMS.filter((item) => userRole && item.roles.includes(userRole));

  const Sidebar = () => (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-primary">POS Toko</p>
          <p className="truncate text-xs text-muted-foreground">Plastik & Bahan Kue</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 rounded-lg bg-muted/50 p-3">
          <p className="truncate text-sm font-medium">{session?.user?.name}</p>
          <Badge variant="secondary" className="mt-1">
            {userRole ? ROLE_LABELS[userRole] : "-"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{APP_NAME}</h1>
          </div>
          {pathname === "/pos" && (
            <Badge variant="success" className="hidden sm:inline-flex">
              Mode Kasir Aktif
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-0 w-0" />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
