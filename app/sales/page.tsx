"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
// Les fonctions de base de données sont maintenant appelées via les API routes
import { Currency } from "@/lib/types";
import type { Product, Customer, SaleItem } from "@prisma/client";
import type { SaleWithRelations } from "@/lib/types";
import { Plus, TrendingUp, Printer, Trash2, Edit } from "lucide-react";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithRelations | null>(
    null
  );
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleWithRelations | null>(
    null
  );
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [saleItems, setSaleItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      saleUnit: string; // 'purchase' or 'sale'
      currency: Currency; // Added currency per product
    }>
  >([
    {
      productId: "default",
      quantity: 0,
      unitPrice: 0,
      saleUnit: "sale",
      currency: Currency.USD,
    },
  ]);

  const [saleData, setSaleData] = useState({
    customerId: "",
    isCredit: false,
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        const [salesResponse, productsResponse, customersResponse] =
          await Promise.all([
            fetch("/api/sales"),
            fetch("/api/products"),
            fetch("/api/customers"),
          ]);

        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(salesData);
        }

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }

        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [router]);

  const addSaleItem = () => {
    setSaleItems([
      ...saleItems,
      {
        productId: "default",
        quantity: 0,
        unitPrice: 0,
        saleUnit: "sale",
        currency: Currency.USD,
      },
    ]);
  };

  const removeSaleItem = (index: number) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  };

  const updateSaleItem = (
    index: number,
    field: string,
    value: string | number | Currency
  ) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSaleItems(updated);
  };

  const calculateTotals = () => {
    const totals = { USD: 0, CDF: 0 };
    saleItems.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      if (item.currency === Currency.USD) {
        totals.USD += itemTotal;
      } else {
        totals.CDF += itemTotal;
      }
    });
    return totals;
  };

  const handleAddNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomerData.name.trim()) {
      alert("Le nom du client est requis");
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCustomerData.name.trim(),
          phone: newCustomerData.phone.trim() || undefined,
        }),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers((prev) => [...prev, newCustomer]);
        setSaleData({ ...saleData, customerId: newCustomer.id });
        setNewCustomerData({ name: "", phone: "", address: "" });
        setIsNewCustomerDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = saleItems.filter(
      (item) =>
        item.productId &&
        item.productId !== "default" &&
        item.quantity > 0 &&
        item.unitPrice > 0
    );

    if (validItems.length === 0) {
      alert("Veuillez ajouter au moins un produit valide");
      return;
    }

    // Validate that all products exist
    for (const item of validItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        alert(
          `Le produit sélectionné n'existe plus. Veuillez actualiser la page.`
        );
        return;
      }
      // Additional validation: ensure productId is not "default" or empty
      if (
        !item.productId ||
        item.productId === "default" ||
        item.productId.trim() === ""
      ) {
        alert("Veuillez sélectionner un produit valide pour tous les items");
        return;
      }
    }

    // Validate credit sales require a customer
    if (
      saleData.isCredit &&
      (!saleData.customerId || saleData.customerId === "anonymous")
    ) {
      alert("Pour une vente à crédit, vous devez sélectionner un client");
      return;
    }

    // Check stock availability
    for (const item of validItems) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        let requiredStock = item.quantity;
        if (item.saleUnit === "purchase") {
          requiredStock = item.quantity * product.conversionFactor;
        }

        if (product.stock < requiredStock) {
          alert(
            `Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock} ${product.saleUnit}`
          );
          return;
        }
      }
    }

    const itemsByUSD = validItems.filter(
      (item) => item.currency === Currency.USD
    );
    const itemsByCDF = validItems.filter(
      (item) => item.currency === Currency.CDF
    );

    try {
      if (editingSale) {
        // For editing, we need to handle the currency separation
        // First, delete the existing sale
        await fetch(`/api/sales/${editingSale.id}`, {
          method: "DELETE",
        });

        // Then create new sales for each currency
        if (itemsByUSD.length > 0) {
          const totalUSD = itemsByUSD.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );
          const saleItemsUSD = itemsByUSD.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            saleUnit:
              item.saleUnit === "purchase"
                ? "unité"
                : products.find((p) => p.id === item.productId)?.saleUnit ||
                  "unité",
          }));

          const responseUSD = await fetch("/api/sales", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerId:
                saleData.customerId === "anonymous"
                  ? null
                  : saleData.customerId,
              items: saleItemsUSD,
              total: totalUSD,
              currency: Currency.USD,
              isCredit: saleData.isCredit,
            }),
          });

          if (!responseUSD.ok) {
            throw new Error("Erreur lors de la création de la vente USD");
          }
        }

        if (itemsByCDF.length > 0) {
          const totalCDF = itemsByCDF.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );
          const saleItemsCDF = itemsByCDF.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            saleUnit:
              item.saleUnit === "purchase"
                ? "unité"
                : products.find((p) => p.id === item.productId)?.saleUnit ||
                  "unité",
          }));

          const responseCDF = await fetch("/api/sales", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerId:
                saleData.customerId === "anonymous"
                  ? null
                  : saleData.customerId,
              items: saleItemsCDF,
              total: totalCDF,
              currency: Currency.CDF,
              isCredit: saleData.isCredit,
            }),
          });

          if (!responseCDF.ok) {
            throw new Error("Erreur lors de la création de la vente CDF");
          }
        }

        // Reload data
        const [salesResponse, productsResponse] = await Promise.all([
          fetch("/api/sales"),
          fetch("/api/products"),
        ]);

        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(salesData);
        }

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }

        resetForm();
        setIsAddDialogOpen(false);
        return;
      }

      // Create separate sales for each currency
      if (itemsByUSD.length > 0) {
        const totalUSD = itemsByUSD.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const saleItemsUSD = itemsByUSD.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          saleUnit:
            item.saleUnit === "purchase"
              ? products.find((p) => p.id === item.productId)?.purchaseUnit ||
                "unité"
              : products.find((p) => p.id === item.productId)?.saleUnit ||
                "unité",
        }));

        const responseUSD = await fetch("/api/sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId:
              saleData.customerId === "anonymous" ? null : saleData.customerId,
            items: saleItemsUSD,
            total: totalUSD,
            currency: Currency.USD,
            isCredit: saleData.isCredit,
          }),
        });

        if (!responseUSD.ok) {
          throw new Error("Erreur lors de la création de la vente USD");
        }
      }

      if (itemsByCDF.length > 0) {
        const totalCDF = itemsByCDF.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const saleItemsCDF = itemsByCDF.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          saleUnit:
            item.saleUnit === "purchase"
              ? products.find((p) => p.id === item.productId)?.purchaseUnit ||
                "unité"
              : products.find((p) => p.id === item.productId)?.saleUnit ||
                "unité",
        }));

        const responseCDF = await fetch("/api/sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId:
              saleData.customerId === "anonymous" ? null : saleData.customerId,
            items: saleItemsCDF,
            total: totalCDF,
            currency: Currency.CDF,
            isCredit: saleData.isCredit,
          }),
        });

        if (!responseCDF.ok) {
          throw new Error("Erreur lors de la création de la vente CDF");
        }
      }

      // Reload data
      const [salesResponse, productsResponse] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
      ]);

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setSales(salesData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de la vente");
      }

      // Reload data
      const [salesResponse, productsResponse] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
      ]);

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setSales(salesData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const handleEdit = (sale: SaleWithRelations) => {
    setEditingSale(sale);
    setSaleData({
      customerId: sale.customerId || "",
      isCredit: sale.isCredit,
    });

    // Convert sale items to the format expected by the form
    // For editing, we'll group items by currency and show USD items first
    const usdItems = sale.items.filter((item) => {
      // Determine currency based on product or price range
      const product = products.find((p) => p.id === item.productId);
      return product && item.unitPrice < 1000; // Simple heuristic: USD items are typically < 1000
    });

    const cdfItems = sale.items.filter((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product && item.unitPrice >= 1000; // CDF items are typically >= 1000
    });

    // Start with USD items, then add CDF items
    const items = [
      ...usdItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        saleUnit: item.saleUnit,
        currency: Currency.USD,
      })),
      ...cdfItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        saleUnit: item.saleUnit,
        currency: Currency.CDF,
      })),
    ] as Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      saleUnit: string;
      currency: Currency;
    }>;

    // If no items, add a default one
    if (items.length === 0) {
      items.push({
        productId: "default",
        quantity: 0,
        unitPrice: 0,
        saleUnit: "sale",
        currency: Currency.USD,
      });
    }

    setSaleItems(items);
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setSaleItems([
      {
        productId: "default",
        quantity: 0,
        unitPrice: 0,
        saleUnit: "sale",
        currency: Currency.USD,
      },
    ]);
    setSaleData({
      customerId: "anonymous",
      isCredit: false,
    });
    setEditingSale(null);
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : "Produit inconnu";
  };

  const getCustomerName = (customerId?: string | null) => {
    if (!customerId || customerId === "anonymous") return "Client anonyme";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : "Client inconnu";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const printInvoice = (sale: SaleWithRelations) => {
    setSelectedSale(sale);
    setIsInvoiceDialogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Ventes</h1>
                <p className="text-muted-foreground">
                  Gérez vos sorties de stock
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle vente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {editingSale
                        ? "Modifier la vente"
                        : "Enregistrer une vente"}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      {editingSale
                        ? "Modifiez les détails de cette vente"
                        : "Créez une nouvelle vente avec plusieurs produits"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">
                        Client{" "}
                        {saleData.isCredit && (
                          <span className="text-red-500">*</span>
                        )}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={saleData.customerId}
                          onValueChange={(value) =>
                            setSaleData({ ...saleData, customerId: value })
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue
                              placeholder={
                                saleData.isCredit
                                  ? "Sélectionner un client (obligatoire)"
                                  : "Client anonyme"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {!saleData.isCredit && (
                              <SelectItem value="anonymous">
                                Client anonyme
                              </SelectItem>
                            )}
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {saleData.isCredit &&
                          (!saleData.customerId ||
                            saleData.customerId === "anonymous") && (
                            <p className="text-sm text-red-500 mt-1">
                              Un client est obligatoire pour les ventes à crédit
                            </p>
                          )}
                        <Dialog
                          open={isNewCustomerDialogOpen}
                          onOpenChange={setIsNewCustomerDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Nouveau client</DialogTitle>
                              <DialogDescription>
                                Ajoutez un nouveau client à votre base de
                                données
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={handleAddNewCustomer}
                              className="space-y-4"
                            >
                              <div className="space-y-2">
                                <Label htmlFor="customerName">
                                  Nom du client *
                                </Label>
                                <Input
                                  id="customerName"
                                  value={newCustomerData.name}
                                  onChange={(e) =>
                                    setNewCustomerData({
                                      ...newCustomerData,
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Nom complet du client"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="customerPhone">
                                  Téléphone (optionnel)
                                </Label>
                                <Input
                                  id="customerPhone"
                                  value={newCustomerData.phone}
                                  onChange={(e) =>
                                    setNewCustomerData({
                                      ...newCustomerData,
                                      phone: e.target.value,
                                    })
                                  }
                                  placeholder="+243 XXX XXX XXX"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="customerAddress">
                                  Adresse (optionnel)
                                </Label>
                                <Input
                                  id="customerAddress"
                                  value={newCustomerData.address}
                                  onChange={(e) =>
                                    setNewCustomerData({
                                      ...newCustomerData,
                                      address: e.target.value,
                                    })
                                  }
                                  placeholder="Adresse du client"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setIsNewCustomerDialogOpen(false);
                                    setNewCustomerData({
                                      name: "",
                                      phone: "",
                                      address: "",
                                    });
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button type="submit">Ajouter le client</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Laissez vide pour un client anonyme ou cliquez sur +
                        pour ajouter un nouveau client
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isCredit"
                        checked={saleData.isCredit}
                        onCheckedChange={(checked) => {
                          const isCredit = checked as boolean;
                          setSaleData({
                            ...saleData,
                            isCredit,
                            // Reset customer if switching from credit to cash
                            customerId: isCredit
                              ? saleData.customerId
                              : "anonymous",
                          });
                        }}
                      />
                      <Label
                        htmlFor="isCredit"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Vente à crédit
                      </Label>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          Produits à vendre
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addSaleItem}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter un produit
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {saleItems.map((item, index) => {
                          const selectedProduct = products.find(
                            (p) => p.id === item.productId
                          );

                          return (
                            <div
                              key={index}
                              className="p-4 border rounded-lg space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <Label className="font-medium">
                                  Produit #{index + 1}
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSaleItem(index)}
                                  disabled={saleItems.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Produit</Label>
                                  <Select
                                    value={item.productId}
                                    onValueChange={(value) =>
                                      updateSaleItem(index, "productId", value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionnez un produit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products
                                        .filter((p) => p.stock >= 0)
                                        .map((product) => {
                                          const isLowStock = product.stock < 2;
                                          const isOutOfStock =
                                            product.stock === 0;
                                          return (
                                            <SelectItem
                                              key={product.id}
                                              value={product.id}
                                              disabled={isOutOfStock}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">
                                                  {product.name}
                                                </span>
                                                <span
                                                  className={`text-sm ${
                                                    isOutOfStock
                                                      ? "text-red-500"
                                                      : isLowStock
                                                      ? "text-orange-500"
                                                      : "text-muted-foreground"
                                                  }`}
                                                >
                                                  Stock: {product.stock}{" "}
                                                  {product.saleUnit}
                                                  {isOutOfStock &&
                                                    " (Rupture de stock)"}
                                                  {isLowStock &&
                                                    !isOutOfStock &&
                                                    " (Stock faible)"}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Unité de vente</Label>
                                  <Select
                                    value={item.saleUnit}
                                    onValueChange={(value) =>
                                      updateSaleItem(index, "saleUnit", value)
                                    }
                                    disabled={!selectedProduct}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sale">
                                        {selectedProduct?.saleUnit || "Détail"}{" "}
                                        (Vente au détail)
                                      </SelectItem>
                                      <SelectItem value="purchase">
                                        {selectedProduct?.purchaseUnit ||
                                          "Gros"}{" "}
                                        (Vente en gros)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Devise</Label>
                                  <Select
                                    value={item.currency}
                                    onValueChange={(value) =>
                                      updateSaleItem(
                                        index,
                                        "currency",
                                        value as Currency
                                      )
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={Currency.USD}>
                                        USD ($)
                                      </SelectItem>
                                      <SelectItem value={Currency.CDF}>
                                        CDF (FC)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Quantité</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateSaleItem(
                                        index,
                                        "quantity",
                                        Number.parseInt(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0"
                                  />
                                  {selectedProduct &&
                                    item.quantity > 0 &&
                                    item.saleUnit === "purchase" && (
                                      <div className="text-sm text-muted-foreground">
                                        ={" "}
                                        {item.quantity *
                                          selectedProduct.conversionFactor}{" "}
                                        {selectedProduct.saleUnit}
                                      </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                  <Label>Prix unitaire</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updateSaleItem(
                                        index,
                                        "unitPrice",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0.00"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Total</Label>
                                  <div className="p-2 bg-muted rounded-md">
                                    <span className="font-medium">
                                      {(item.quantity * item.unitPrice).toFixed(
                                        2
                                      )}{" "}
                                      {item.currency}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">
                          Récapitulatif de la vente
                        </Label>
                        {(() => {
                          const totals = calculateTotals();
                          return (
                            <div className="space-y-1">
                              {totals.USD > 0 && (
                                <div className="flex justify-between">
                                  <span>Total USD:</span>
                                  <span className="font-bold">
                                    ${totals.USD.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {totals.CDF > 0 && (
                                <div className="flex justify-between">
                                  <span>Total CDF:</span>
                                  <span className="font-bold">
                                    {totals.CDF.toFixed(0)} FC
                                  </span>
                                </div>
                              )}
                              {totals.USD === 0 && totals.CDF === 0 && (
                                <div className="text-center text-muted-foreground">
                                  Aucun produit ajouté
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={(() => {
                          const totals = calculateTotals();
                          const hasValidItems =
                            totals.USD > 0 || totals.CDF > 0;
                          const creditRequiresCustomer =
                            saleData.isCredit &&
                            (!saleData.customerId ||
                              saleData.customerId === "anonymous");
                          return !hasValidItems || creditRequiresCustomer;
                        })()}
                        title={
                          saleData.isCredit &&
                          (!saleData.customerId ||
                            saleData.customerId === "anonymous")
                            ? "Sélectionnez un client pour une vente à crédit"
                            : undefined
                        }
                      >
                        {editingSale
                          ? "Mettre à jour la vente"
                          : "Enregistrer la vente"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total ventes
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sales.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Transactions enregistrées
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Revenus USD
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {sales
                      .filter((s) => s.currency === Currency.USD)
                      .reduce((sum, s) => sum + s.total, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ventes en USD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Revenus CDF
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sales
                      .filter((s) => s.currency === Currency.CDF)
                      .reduce((sum, s) => sum + s.total, 0)
                      .toFixed(0)}{" "}
                    FC
                  </div>
                  <p className="text-xs text-muted-foreground">Ventes en CDF</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Historique des ventes
                </CardTitle>
                <CardDescription>
                  {sales.length} vente{sales.length > 1 ? "s" : ""} enregistrée
                  {sales.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Articles</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales
                      .slice()
                      .reverse()
                      .map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{formatDate(sale.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {sale.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {getCustomerName(sale.customerId)}
                          </TableCell>
                          <TableCell>
                            {sale.items.length} article
                            {sale.items.length > 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="font-medium">
                            {sale.total.toFixed(2)} {sale.currency}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                sale.isCredit
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              }`}
                            >
                              {sale.isCredit ? "Crédit" : "Comptant"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(sale)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printInvoice(sale)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(sale.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {sales.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucune vente enregistrée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Facture</DialogTitle>
            <DialogDescription>
              Aperçu de la facture à imprimer
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6 print:space-y-4">
              <div className="text-center border-b pb-4 print:pb-2">
                <h1 className="text-2xl font-bold print:text-xl">
                  StockManager
                </h1>
                <p className="text-muted-foreground print:text-black">
                  Facture de vente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div>
                  <h3 className="font-semibold mb-2">Informations de vente</h3>
                  <p>Facture: {selectedSale.invoiceNumber}</p>
                  <p>Date: {formatDate(selectedSale.createdAt)}</p>
                  <p>
                    Type:{" "}
                    {selectedSale.isCredit
                      ? "Vente à crédit"
                      : "Vente comptant"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Client</h3>
                  <p>{getCustomerName(selectedSale.customerId)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Détails des articles</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{getProductName(item.productId)}</TableCell>
                        <TableCell>
                          {item.quantity} {item.saleUnit}
                        </TableCell>
                        <TableCell>
                          {item.unitPrice.toFixed(2)} {selectedSale.currency}
                        </TableCell>
                        <TableCell>
                          {item.total.toFixed(2)} {selectedSale.currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 print:pt-2">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Total: {selectedSale.total.toFixed(2)}{" "}
                      {selectedSale.currency}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceDialogOpen(false)}
                >
                  Fermer
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
