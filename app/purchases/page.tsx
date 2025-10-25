"use client";

import type React from "react";

import { useEffect, useState, useCallback } from "react";
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
import { AuthRoute } from "@/components/auth-route";
import { useProductSync } from "@/lib/use-data-sync";
import { SearchableSelect } from "@/components/ui/searchable-select";
// Les fonctions de base de données sont maintenant appelées via les API routes
import { Currency } from "@/lib/types";
import type { Purchase, Product } from "@prisma/client";
import { Plus, ShoppingCart, Package, Edit, Trash2 } from "lucide-react";

// Composant optimisé pour afficher une ligne d'achat
function PurchaseRow({
  purchase,
  onEdit,
  onDelete,
  getProductName,
  getProductUnit,
}: {
  purchase: Purchase;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
  getProductName: (productId: string) => string;
  getProductUnit: (productId: string) => string;
}) {
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
      <TableCell>{formatDate(purchase.createdAt)}</TableCell>
      <TableCell>{purchase.supplier || "-"}</TableCell>
      <TableCell className="font-medium">
        {getProductName(purchase.productId)}
      </TableCell>
      <TableCell>
        {purchase.quantity} ({getProductUnit(purchase.productId)})
      </TableCell>
      <TableCell>{purchase.unitPrice.toFixed(2)}</TableCell>
      <TableCell className="font-medium">
        {purchase.total.toFixed(2)} {purchase.currency}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(purchase)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(purchase.id)}
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

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
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
        // Charger les achats en premier (données principales)
        setIsLoadingPurchases(true);
        const purchasesResponse = await fetch("/api/purchases");
        if (purchasesResponse.ok) {
          const purchasesData = await purchasesResponse.json();
          setPurchases(purchasesData);
        }
        setIsLoadingPurchases(false);

        // Charger les produits (nécessaires pour le formulaire)
        setIsLoadingProducts(true);
        const productsResponse = await fetch("/api/products");
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
        setIsLoadingProducts(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoadingPurchases(false);
        setIsLoadingProducts(false);
      }
    };

    loadData();
  }, [router]);

  // Fonction pour recharger les produits
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const total = formData.quantity * formData.unitPrice;

      let response;
      if (editingPurchase) {
        // Update existing purchase
        response = await fetch(`/api/purchases/${editingPurchase.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            total,
          }),
        });
      } else {
        // Create new purchase
        response = await fetch("/api/purchases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            total,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la sauvegarde de l'achat"
        );
      }

      const newPurchase = await response.json();

      // Add the new purchase to the local state immediately
      if (!editingPurchase) {
        setPurchases((prevPurchases) => [newPurchase, ...prevPurchases]);
      } else {
        // Update the existing purchase in the local state
        setPurchases((prevPurchases) =>
          prevPurchases.map((p) =>
            p.id === editingPurchase.id ? newPurchase : p
          )
        );
      }

      // Mise à jour immédiate du stock local
      const updatedProducts = products.map((product) => {
        if (product.id === formData.productId) {
          const stockIncrease = formData.quantity;
          return {
            ...product,
            stock: product.stock + stockIncrease,
          };
        }
        return product;
      });
      setProducts(updatedProducts);

      // Update products list to reflect stock changes
      await reloadProducts();

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
      console.error("Error saving purchase:", error);
      alert(
        `Erreur lors de la sauvegarde de l'achat: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsSubmitting(false);
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

  const getProductUnit = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.purchaseUnit : "unité";
  };

  // Filtrer les achats par terme de recherche et date
  const filteredPurchases = purchases
    .filter((purchase) => {
      const productName = getProductName(purchase.productId);
      const purchaseDate = new Date(purchase.createdAt)
        .toISOString()
        .split("T")[0];

      // Filtre par date
      const dateMatch = selectedDate ? purchaseDate === selectedDate : true;

      // Filtre par terme de recherche
      const searchMatch = searchTerm
        ? productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return dateMatch && searchMatch;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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
                    Achats
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Gérez vos entrées de stock
                  </p>
                </div>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Nouvel achat</span>
                      <span className="sm:hidden">Nouveau</span>
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
                        <Label htmlFor="supplier">
                          Fournisseur (optionnel)
                        </Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              supplier: e.target.value,
                            })
                          }
                          placeholder="Ex: Fournisseur ABC"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product">Produit</Label>
                        <SearchableSelect
                          value={formData.productId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, productId: value })
                          }
                          options={products.map((product) => ({
                            value: product.id,
                            label: `${product.name} (${product.purchaseUnit})`,
                          }))}
                          placeholder="Sélectionner un produit"
                          searchPlaceholder="Rechercher un produit..."
                          emptyMessage="Aucun produit trouvé"
                        />
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
                              ? products.find(
                                  (p) => p.id === formData.productId
                                )?.purchaseUnit
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
                                unitPrice:
                                  Number.parseFloat(e.target.value) || 0,
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
                            <SelectItem value={Currency.USD}>
                              USD ($)
                            </SelectItem>
                            <SelectItem value={Currency.CDF}>
                              CDF (FC)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total:</span>
                          <span className="text-lg font-bold">
                            {(formData.quantity * formData.unitPrice).toFixed(
                              2
                            )}{" "}
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
                        <Button
                          type="submit"
                          disabled={!formData.productId || isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>En cours...</span>
                            </div>
                          ) : editingPurchase ? (
                            "Mettre à jour"
                          ) : (
                            "Enregistrer l'achat"
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
                    <p className="text-xs text-muted-foreground">
                      Achats en USD
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Achats en CDF
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Barre de recherche et filtre de date */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      placeholder="Rechercher un achat..."
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
                  {filteredPurchases.length} achat
                  {filteredPurchases.length > 1 ? "s" : ""} trouvé
                  {filteredPurchases.length > 1 ? "s" : ""}
                  {searchTerm && ` pour "${searchTerm}"`}
                  {selectedDate &&
                    ` le ${new Date(selectedDate).toLocaleDateString("fr-FR")}`}
                </div>
              )}

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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">
                            Date
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Fournisseur
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Produit
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Quantité
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Prix unitaire
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Total
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingPurchases ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-muted-foreground py-8"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Chargement des achats...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {filteredPurchases.map((purchase) => {
                              return (
                                <PurchaseRow
                                  key={purchase.id}
                                  purchase={purchase}
                                  onEdit={handleEdit}
                                  onDelete={handleDelete}
                                  getProductName={getProductName}
                                  getProductUnit={getProductUnit}
                                />
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
      </div>
    </AuthRoute>
  );
}
