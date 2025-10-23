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
// Les fonctions de base de données sont maintenant appelées via les API routes
import type { Product } from "@prisma/client";
import type { ProductStockInfo } from "@/lib/types";
import { Plus, Edit, Package } from "lucide-react";

// Composant pour afficher une ligne de produit avec les infos de stock
function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}) {
  const [stockInfo, setStockInfo] = useState<ProductStockInfo | null>(null);

  useEffect(() => {
    const loadStockInfo = async () => {
      try {
        const response = await fetch(`/api/products/${product.id}`);
        if (response.ok) {
          const info = await response.json();
          setStockInfo(info);
        }
      } catch (error) {
        console.error("Error loading stock info:", error);
      }
    };
    loadStockInfo();
  }, [product.id]);

  return (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>
        <div className="text-sm">
          <div>Achat: {product.purchaseUnit}</div>
          <div>Vente: {product.saleUnit}</div>
          <div className="text-muted-foreground">
            1:{product.conversionFactor}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">
            {stockInfo?.displayText || "Chargement..."}
          </div>
          <div className="text-muted-foreground">
            ({product.stock} {product.saleUnit})
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            product.stock < 10
              ? "bg-destructive/10 text-destructive"
              : product.stock < 50
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
              : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
          }`}
        >
          {product.stock < 10
            ? "Stock faible"
            : product.stock < 50
            ? "Stock moyen"
            : "En stock"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
            <Edit className="h-4 w-4" />
          </Button>
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button> */}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    purchaseUnit: "",
    saleUnit: "",
    conversionFactor: 1,
    stock: 0,
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/products");
        if (response.ok) {
          const productsData = await response.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [router]);

  // Filtrer les produits par terme de recherche
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;

      if (editingProduct) {
        // Update existing product
        response = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Add new product
        response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la sauvegarde du produit"
        );
      }

      const newProduct = await response.json();

      // Add the new product to the local state immediately
      if (!editingProduct) {
        setProducts((prevProducts) => [newProduct, ...prevProducts]);
      } else {
        // Update the existing product in the local state
        setProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProduct.id ? newProduct : p))
        );
      }

      setFormData({
        name: "",
        purchaseUnit: "",
        saleUnit: "",
        conversionFactor: 1,
        stock: 0,
      });
      setIsAddDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      alert(
        `Erreur lors de la sauvegarde du produit: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la suppression du produit"
        );
      }

      // Remove the product from the local state immediately
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product.id !== productId)
      );

      // Also clear the cache to ensure fresh data
      // Note: In a real app, you might want to call a cache invalidation endpoint
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(
        `Erreur lors de la suppression du produit: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      purchaseUnit: product.purchaseUnit,
      saleUnit: product.saleUnit,
      conversionFactor: product.conversionFactor,
      stock: product.stock,
    });
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      purchaseUnit: "",
      saleUnit: "",
      conversionFactor: 1,
      stock: 0,
    });
  };

  return (
    <AuthRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Produits
                  </h1>
                  <p className="text-muted-foreground">
                    Gérez votre inventaire
                  </p>
                </div>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un produit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct
                          ? "Modifier le produit"
                          : "Ajouter un produit"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingProduct
                          ? "Modifiez les informations du produit"
                          : "Ajoutez un nouveau produit à votre inventaire"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom du produit</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Ex: Coca-Cola"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchaseUnit">Unité d'achat</Label>
                        <Input
                          id="purchaseUnit"
                          value={formData.purchaseUnit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchaseUnit: e.target.value,
                            })
                          }
                          placeholder="Ex: caisse, sac, carton"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="saleUnit">Unité de vente</Label>
                        <Input
                          id="saleUnit"
                          value={formData.saleUnit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              saleUnit: e.target.value,
                            })
                          }
                          placeholder="Ex: bouteille, kg, pièce"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conversionFactor">
                          Facteur de conversion
                        </Label>
                        <Input
                          id="conversionFactor"
                          type="number"
                          min="1"
                          step="1"
                          value={formData.conversionFactor}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              conversionFactor:
                                Number.parseInt(e.target.value) || 1,
                            })
                          }
                          placeholder="Ex: 24 (1 caisse = 24 bouteilles)"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Combien de {formData.saleUnit || "unités de vente"}{" "}
                          dans 1 {formData.purchaseUnit || "unité d'achat"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock">
                          Stock initial (en{" "}
                          {formData.saleUnit || "unités de vente"})
                        </Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stock: Number.parseInt(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCloseDialog}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>En cours...</span>
                            </div>
                          ) : editingProduct ? (
                            "Modifier"
                          ) : (
                            "Ajouter"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Barre de recherche */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Input
                    placeholder="Rechercher un produit..."
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

              {/* Indicateur de résultats de recherche */}
              {searchTerm && (
                <div className="text-sm text-muted-foreground">
                  {filteredProducts.length} produit
                  {filteredProducts.length > 1 ? "s" : ""} trouvé
                  {filteredProducts.length > 1 ? "s" : ""} pour "{searchTerm}"
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Liste des produits
                  </CardTitle>
                  <CardDescription>
                    {products.length} produit{products.length > 1 ? "s" : ""} en
                    inventaire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">
                          Chargement des produits...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Unités</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <ProductRow
                            key={product.id}
                            product={product}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </AuthRoute>
  );
}
