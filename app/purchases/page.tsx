"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Purchase, Product } from "@prisma/client";
import { Plus, ShoppingCart, Package, Edit, Trash2 } from "lucide-react";

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState({
    supplier: "",
    productId: "",
    quantity: 0,
    unitPrice: 0,
    currency: Currency.USD,
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        const [purchasesResponse, productsResponse] = await Promise.all([
          fetch("/api/purchases"),
          fetch("/api/products"),
        ]);

        if (purchasesResponse.ok) {
          const purchasesData = await purchasesResponse.json();
          setPurchases(purchasesData);
        }

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const total = formData.quantity * formData.unitPrice;

      if (editingPurchase) {
        // Update existing purchase
        const response = await fetch(`/api/purchases/${editingPurchase.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            total,
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la mise à jour de l'achat");
        }
      } else {
        // Create new purchase
        const response = await fetch("/api/purchases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            total,
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la création de l'achat");
        }
      }

      // Reload data
      const [purchasesResponse, productsResponse] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/products"),
      ]);

      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        setPurchases(purchasesData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      setFormData({
        supplier: "",
        productId: "",
        quantity: 0,
        unitPrice: 0,
        currency: Currency.USD,
      });
      setIsAddDialogOpen(false);
      setEditingPurchase(null);
    } catch (error) {
      console.error("Error creating purchase:", error);
    }
  };

  const handleDelete = async (purchaseId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet achat ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/purchases/${purchaseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'achat");
      }

      // Reload data
      const [purchasesResponse, productsResponse] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/products"),
      ]);

      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        setPurchases(purchasesData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplier: purchase.supplier || "",
      productId: purchase.productId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      currency: purchase.currency as Currency,
    });
    setIsAddDialogOpen(true);
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : "Produit inconnu";
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Achats</h1>
                <p className="text-muted-foreground">
                  Gérez vos entrées de stock
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel achat
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPurchase
                        ? "Modifier l'achat"
                        : "Enregistrer un achat"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPurchase
                        ? "Modifiez les détails de cet achat"
                        : "Ajoutez un nouvel achat pour augmenter votre stock"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Fournisseur (optionnel)</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) =>
                          setFormData({ ...formData, supplier: e.target.value })
                        }
                        placeholder="Ex: Fournisseur ABC"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product">Produit</Label>
                      <Select
                        value={formData.productId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, productId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.purchaseUnit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">
                          Quantité{" "}
                          {formData.productId &&
                          products.find((p) => p.id === formData.productId)
                            ? `(en ${
                                products.find(
                                  (p) => p.id === formData.productId
                                )?.purchaseUnit
                              })`
                            : ""}
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.quantity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quantity: Number.parseInt(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">
                          Prix par{" "}
                          {formData.productId &&
                          products.find((p) => p.id === formData.productId)
                            ? products.find((p) => p.id === formData.productId)
                                ?.purchaseUnit
                            : "unité"}
                        </Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.unitPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              unitPrice: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    {formData.productId && formData.quantity > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-sm">
                          <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Impact sur le stock:
                          </div>
                          {(() => {
                            const product = products.find(
                              (p) => p.id === formData.productId
                            );
                            if (!product) return null;
                            const stockIncrease =
                              formData.quantity * product.conversionFactor;
                            return (
                              <div className="text-blue-700 dark:text-blue-300">
                                +{stockIncrease} {product.saleUnit}
                                {stockIncrease > 1 ? "s" : ""}(
                                {formData.quantity} {product.purchaseUnit}
                                {formData.quantity > 1 ? "s" : ""})
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="currency">Devise</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            currency: value as Currency,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Currency.USD}>USD ($)</SelectItem>
                          <SelectItem value={Currency.CDF}>CDF (FC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total:</span>
                        <span className="text-lg font-bold">
                          {(formData.quantity * formData.unitPrice).toFixed(2)}{" "}
                          {formData.currency}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setEditingPurchase(null);
                          setFormData({
                            supplier: "",
                            productId: "",
                            quantity: 0,
                            unitPrice: 0,
                            currency: Currency.USD,
                          });
                        }}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={!formData.productId}>
                        {editingPurchase
                          ? "Mettre à jour"
                          : "Enregistrer l'achat"}
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
                    Total achats
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{purchases.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Transactions enregistrées
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valeur USD
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {purchases
                      .filter((p) => p.currency === Currency.USD)
                      .reduce((sum, p) => sum + p.total, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Achats en USD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valeur CDF
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {purchases
                      .filter((p) => p.currency === Currency.CDF)
                      .reduce((sum, p) => sum + p.total, 0)
                      .toFixed(0)}{" "}
                    FC
                  </div>
                  <p className="text-xs text-muted-foreground">Achats en CDF</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Historique des achats
                </CardTitle>
                <CardDescription>
                  {purchases.length} achat{purchases.length > 1 ? "s" : ""}{" "}
                  enregistré{purchases.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases
                      .slice()
                      .reverse()
                      .map((purchase) => {
                        const product = products.find(
                          (p) => p.id === purchase.productId
                        );
                        return (
                          <TableRow key={purchase.id}>
                            <TableCell>
                              {formatDate(purchase.createdAt)}
                            </TableCell>
                            <TableCell>
                              {purchase.supplier || "Non spécifié"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getProductName(purchase.productId)}
                            </TableCell>
                            <TableCell>
                              {purchase.quantity}{" "}
                              {product?.purchaseUnit || "unité"}
                              {purchase.quantity > 1 ? "s" : ""}
                              {product && (
                                <div className="text-xs text-muted-foreground">
                                  ={" "}
                                  {purchase.quantity * product.conversionFactor}{" "}
                                  {product.saleUnit}
                                  {purchase.quantity *
                                    product.conversionFactor >
                                  1
                                    ? "s"
                                    : ""}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {purchase.unitPrice.toFixed(2)}{" "}
                              {purchase.currency}
                            </TableCell>
                            <TableCell className="font-medium">
                              {purchase.total.toFixed(2)} {purchase.currency}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(purchase)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(purchase.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {purchases.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucun achat enregistré
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
    </div>
  );
}
