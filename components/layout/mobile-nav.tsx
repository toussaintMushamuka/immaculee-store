"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  DollarSign,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Achats", href: "/purchases", icon: ShoppingCart },
  { name: "Ventes", href: "/sales", icon: TrendingUp },
  { name: "Clients", href: "/customers", icon: Users },
  { name: "Dépenses", href: "/expenses", icon: Receipt },
  { name: "Rapports", href: "/reports", icon: BarChart3 },
  { name: "Taux de change", href: "/exchange-rates", icon: DollarSign },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-50"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-black">G-stock</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-black hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:text-black hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  localStorage.removeItem("isAuthenticated");
                  window.location.href = "/login";
                }}
                className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
              >
                <CreditCard className="mr-3 h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
