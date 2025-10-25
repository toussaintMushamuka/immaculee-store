"use client";

import type React from "react";

import { useEffect, useState, useCallback } from "react";
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
import { AuthRoute } from "@/components/auth-route";
import { useProductSync } from "@/lib/use-data-sync";
import { SearchableSelect } from "@/components/ui/searchable-select";
// Les fonctions de base de données sont maintenant appelées via les API routes
import { Currency } from "@/lib/types";
import type { Product, Customer, SaleItem } from "@prisma/client";
import type { SaleWithRelations } from "@/lib/types";
import { Plus, TrendingUp, Printer, Trash2, Edit } from "lucide-react";

// Composant optimisé pour afficher une ligne de vente
function SaleRow({
  sale,
  onEdit,
  onDelete,
  onViewInvoice,
}: {
  sale: SaleWithRelations;
  onEdit: (sale: SaleWithRelations) => void;
  onDelete: (saleId: string) => void;
  onViewInvoice: (sale: SaleWithRelations) => void;
}) {
  const getCustomerName = (customerId: string | null) => {
    if (!customerId || customerId === "anonymous") return "Client anonyme";
    return sale.customer?.name || "Client inconnu";
  };

  const getProductName = (productId: string) => {
    const item = sale.items.find((item) => item.productId === productId);
    return item?.product?.name || "Produit inconnu";
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

  return (
    <TableRow>
      <TableCell>{formatDate(sale.createdAt)}</TableCell>
      <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
      <TableCell>{getCustomerName(sale.customerId || null)}</TableCell>
      <TableCell>
        {sale.items.length > 0 ? (
          <div className="space-y-1">
            {sale.items.slice(0, 2).map((item, index) => (
              <div key={index} className="text-sm">
                {getProductName(item.productId)}
              </div>
            ))}
            {sale.items.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{sale.items.length - 2} autre
                {sale.items.length - 2 > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {sale.items.length > 0 ? (
          <div className="space-y-1">
            {sale.items.slice(0, 2).map((item, index) => (
              <div key={index} className="text-sm">
                {item.quantity} {item.saleUnit}
              </div>
            ))}
            {sale.items.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{sale.items.length - 2} autre
                {sale.items.length - 2 > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="font-medium">
        <div className="space-y-1">
          {sale.totalUSD && sale.totalUSD > 0 && (
            <div className="text-sm">${sale.totalUSD.toFixed(2)} USD</div>
          )}
          {sale.totalCDF && sale.totalCDF > 0 && (
            <div className="text-sm">{sale.totalCDF.toFixed(0)} FC CDF</div>
          )}
          {(!sale.totalUSD || sale.totalUSD === 0) &&
            (!sale.totalCDF || sale.totalCDF === 0) && (
              <div className="text-sm">
                {sale.total.toFixed(2)} {sale.currency}
              </div>
            )}
        </div>
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
            onClick={() => onViewInvoice(sale)}
            title="Voir la facture"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(sale)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(sale.id)}
            className="text-destructive hover:text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
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
        // Charger les ventes en premier (données principales)
        setIsLoadingSales(true);
        const salesResponse = await fetch("/api/sales");
        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(salesData);
        }
        setIsLoadingSales(false);

        // Charger les produits (nécessaires pour le formulaire)
        setIsLoadingProducts(true);
        const productsResponse = await fetch("/api/products");
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
        setIsLoadingProducts(false);

        // Charger les clients (nécessaires pour le formulaire)
        setIsLoadingCustomers(true);
        const customersResponse = await fetch("/api/customers");
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData);
        }
        setIsLoadingCustomers(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoadingSales(false);
        setIsLoadingProducts(false);
        setIsLoadingCustomers(false);
      }
    };

    loadData();
  }, [router]);

  const reloadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch("/api/products");
      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error reloading products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Recharger automatiquement les produits quand on revient sur la page
  useProductSync(reloadProducts);

  const addSaleItem = () => {
    // Reload products to ensure we have the latest stock data
    reloadProducts();

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
    e.stopPropagation();

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
    setIsSubmitting(true);

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

    // For non-credit sales, set anonymous customer if no customer is selected
    if (
      !saleData.isCredit &&
      (!saleData.customerId || saleData.customerId === "")
    ) {
      saleData.customerId = "anonymous";
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

    // Calculate totals by currency
    const totalUSD = validItems
      .filter((item) => item.currency === Currency.USD)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const totalCDF = validItems
      .filter((item) => item.currency === Currency.CDF)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Prepare sale items with currency
    const saleItemsData = validItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      saleUnit:
        item.saleUnit === "purchase"
          ? "unité"
          : products.find((p) => p.id === item.productId)?.saleUnit || "unité",
      currency: item.currency,
    }));

    try {
      if (editingSale) {
        // For editing, delete the existing sale first
        await fetch(`/api/sales/${editingSale.id}`, {
          method: "DELETE",
        });
      }

      // Create a single sale with all items
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId:
            saleData.customerId === "anonymous" ? null : saleData.customerId,
          items: saleItemsData,
          totalUSD: totalUSD > 0 ? totalUSD : undefined,
          totalCDF: totalCDF > 0 ? totalCDF : undefined,
          isCredit: saleData.isCredit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création de la vente"
        );
      }

      // Mise à jour immédiate du stock local
      const updatedProducts = products.map((product) => {
        const soldItem = validItems.find(
          (item) => item.productId === product.id
        );
        if (soldItem) {
          const stockReduction =
            soldItem.saleUnit === "purchase"
              ? soldItem.quantity
              : soldItem.quantity / (product.conversionFactor || 1);
          return {
            ...product,
            stock: Math.max(0, product.stock - stockReduction),
          };
        }
        return product;
      });
      setProducts(updatedProducts);

      // Reload data from server to ensure consistency
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
      alert(
        `Erreur lors de la création de la vente: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (saleId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cette vente ? Cette action restaurera le stock des produits."
      )
    ) {
      return;
    }

    try {
      // Show loading state
      setIsLoadingSales(true);

      // Récupérer les détails de la vente avant suppression pour mise à jour du stock
      const saleToDelete = sales.find((sale) => sale.id === saleId);

      const response = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la suppression de la vente"
        );
      }

      // Mise à jour immédiate du stock local (restauration)
      if (saleToDelete && saleToDelete.items) {
        const updatedProducts = products.map((product) => {
          const soldItem = saleToDelete.items.find(
            (item: any) => item.productId === product.id
          );
          if (soldItem) {
            const stockRestoration =
              soldItem.saleUnit === "purchase"
                ? soldItem.quantity
                : soldItem.quantity / (product.conversionFactor || 1);
            return {
              ...product,
              stock: product.stock + stockRestoration,
            };
          }
          return product;
        });
        setProducts(updatedProducts);
      }

      // Reload data in parallel
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

      // Show success message
      alert("Vente supprimée avec succès. Le stock a été restauré.");
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert(
        `Erreur lors de la suppression de la vente: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsLoadingSales(false);
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
    // Recharger les produits avant d'ouvrir le dialog pour avoir les stocks à jour
    reloadProducts();
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

  // Filtrer les ventes par terme de recherche et date
  const filteredSales = sales.filter((sale) => {
    const customerName = getCustomerName(sale.customerId);
    const saleDate = new Date(sale.createdAt).toISOString().split("T")[0];

    // Filtre par date
    const dateMatch = selectedDate ? saleDate === selectedDate : true;

    // Filtre par terme de recherche
    const searchMatch = searchTerm
      ? customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some((item) =>
          item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;

    return dateMatch && searchMatch;
  });

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
    <AuthRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Ventes
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Gérez vos sorties de stock
                  </p>
                </div>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Nouvelle vente</span>
                      <span className="sm:hidden">Nouvelle</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select
                            value={
                              saleData.customerId ||
                              (saleData.isCredit ? "" : "anonymous")
                            }
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
                                <SelectItem
                                  key={customer.id}
                                  value={customer.id}
                                >
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {saleData.isCredit &&
                            (!saleData.customerId ||
                              saleData.customerId === "anonymous") && (
                              <p className="text-sm text-red-500 mt-1">
                                Un client est obligatoire pour les ventes à
                                crédit
                              </p>
                            )}
                          <Dialog
                            open={isNewCustomerDialogOpen}
                            onOpenChange={setIsNewCustomerDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                              >
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
                                  <Button type="submit">
                                    Ajouter le client
                                  </Button>
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
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={reloadProducts}
                              title="Rafraîchir la liste des produits"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addSaleItem}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Ajouter un produit
                            </Button>
                          </div>
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

                                {/* Premier bloc: Produit (pleine largeur) */}
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">
                                    Produit
                                  </Label>
                                  <SearchableSelect
                                    value={item.productId}
                                    onValueChange={(value) =>
                                      updateSaleItem(index, "productId", value)
                                    }
                                    options={products
                                      .filter((p) => p.stock >= 0)
                                      .map((product) => {
                                        const isLowStock = product.stock <= 2;
                                        const isOutOfStock =
                                          product.stock === 0;

                                        return {
                                          value: product.id,
                                          label: `${product.name} - Stock: ${
                                            product.stock
                                          } ${product.saleUnit}${
                                            isOutOfStock
                                              ? " (Rupture de stock)"
                                              : isLowStock
                                              ? " (Stock faible)"
                                              : ""
                                          }`,
                                          disabled: isOutOfStock,
                                        };
                                      })}
                                    placeholder="Sélectionner un produit"
                                    searchPlaceholder="Rechercher un produit..."
                                    emptyMessage="Aucun produit trouvé"
                                    className="h-12"
                                  />
                                </div>

                                {/* Deuxième bloc: Unité de vente (pleine largeur) */}
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">
                                    Unité de vente
                                  </Label>
                                  <Select
                                    value={item.saleUnit}
                                    onValueChange={(value) =>
                                      updateSaleItem(index, "saleUnit", value)
                                    }
                                    disabled={!selectedProduct}
                                  >
                                    <SelectTrigger className="h-12">
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

                                {/* Troisième bloc: Quantité, Prix unitaire et Devise */}
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-base font-medium">
                                        Quantité
                                      </Label>
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
                                        className="h-12 text-lg"
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
                                      <Label className="text-base font-medium">
                                        Prix unitaire
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) =>
                                          updateSaleItem(
                                            index,
                                            "unitPrice",
                                            Number.parseFloat(e.target.value) ||
                                              0
                                          )
                                        }
                                        placeholder="0.00"
                                        className="h-12 text-lg"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-base font-medium">
                                        Devise
                                      </Label>
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
                                        <SelectTrigger className="h-12">
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
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-base font-medium">
                                    Total
                                  </Label>
                                  <div className="p-4 bg-muted rounded-md h-12 flex items-center">
                                    <span className="font-semibold text-lg">
                                      {(item.quantity * item.unitPrice).toFixed(
                                        2
                                      )}{" "}
                                      {item.currency}
                                    </span>
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
                            return (
                              !hasValidItems ||
                              creditRequiresCustomer ||
                              isSubmitting
                            );
                          })()}
                          title={
                            saleData.isCredit &&
                            (!saleData.customerId ||
                              saleData.customerId === "anonymous")
                              ? "Sélectionnez un client pour une vente à crédit"
                              : undefined
                          }
                        >
                          {isSubmitting ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>En cours...</span>
                            </div>
                          ) : editingSale ? (
                            "Mettre à jour la vente"
                          ) : (
                            "Enregistrer la vente"
                          )}
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
                    <p className="text-xs text-muted-foreground">
                      Ventes en USD
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Ventes en CDF
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Barre de recherche et filtre de date */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      placeholder="Rechercher une vente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                    >
                      Effacer
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="date-filter" className="text-sm font-medium">
                    Date:
                  </Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedDate(new Date().toISOString().split("T")[0])
                    }
                    title="Aujourd'hui"
                  >
                    Aujourd'hui
                  </Button>
                </div>
              </div>

              {/* Indicateur de résultats de recherche */}
              {(searchTerm || selectedDate) && (
                <div className="text-sm text-muted-foreground">
                  {filteredSales.length} vente
                  {filteredSales.length > 1 ? "s" : ""} trouvée
                  {filteredSales.length > 1 ? "s" : ""}
                  {searchTerm && ` pour "${searchTerm}"`}
                  {selectedDate &&
                    ` le ${new Date(selectedDate).toLocaleDateString("fr-FR")}`}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Historique des ventes
                  </CardTitle>
                  <CardDescription>
                    {sales.length} vente{sales.length > 1 ? "s" : ""}{" "}
                    enregistrée
                    {sales.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">
                            Date
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Facture
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Client
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Produit
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Quantité
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Total
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Type
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingSales ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground py-8"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Chargement des ventes...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {filteredSales.map((sale) => (
                              <SaleRow
                                key={sale.id}
                                sale={sale}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onViewInvoice={printInvoice}
                              />
                            ))}
                            {sales.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  className="text-center text-muted-foreground py-8"
                                >
                                  Aucune vente enregistrée
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Invoice Dialog */}
        <Dialog
          open={isInvoiceDialogOpen}
          onOpenChange={setIsInvoiceDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none print:border-none w-[95vw] sm:w-full">
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
                    <h3 className="font-semibold mb-2">
                      Informations de vente
                    </h3>
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
                          <TableCell>
                            {getProductName(item.productId)}
                          </TableCell>
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
    </AuthRoute>
  );
}
