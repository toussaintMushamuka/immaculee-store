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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthRoute } from "@/components/auth-route";
// Removed direct database imports - using API routes instead
import { Currency } from "@/lib/types";
import type { Customer, Payment } from "@prisma/client";
import type { SaleWithRelations, CustomerWithRelations } from "@/lib/types";
import { Plus, Users, CreditCard, Eye, AlertTriangle } from "lucide-react";

// Composant optimisé pour afficher une ligne de client
function CustomerRow({
  customer,
  onViewDetails,
  onAddPayment,
}: {
  customer: CustomerWithRelations;
  onViewDetails: (customer: CustomerWithRelations) => void;
  onAddPayment: (customer: CustomerWithRelations) => void;
}) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculer la dette du client avec les devises appropriées
  const calculateDebt = () => {
    // Calculer les ventes à crédit par devise
    const salesUSD = customer.sales
      .filter((sale) => sale.currency === Currency.USD && sale.isCredit)
      .reduce((sum, sale) => sum + sale.total, 0);

    const salesCDF = customer.sales
      .filter((sale) => sale.currency === Currency.CDF && sale.isCredit)
      .reduce((sum, sale) => sum + sale.total, 0);

    // Calculer les paiements par devise
    const paymentsUSD = customer.payments
      .filter((payment) => payment.currency === Currency.USD)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const paymentsCDF = customer.payments
      .filter((payment) => payment.currency === Currency.CDF)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Calculer les dettes par devise
    const debtUSD = salesUSD - paymentsUSD;
    const debtCDF = salesCDF - paymentsCDF;

    return { usd: debtUSD, cdf: debtCDF };
  };

  const debt = calculateDebt();
  const isInDebt = debt.usd > 0 || debt.cdf > 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>{customer.phone || "-"}</TableCell>
      <TableCell className="text-center">{customer.sales.length}</TableCell>
      <TableCell
        className={`font-medium ${
          isInDebt ? "text-red-600" : "text-green-600"
        }`}
      >
        {isInDebt ? (
          <div className="space-y-1">
            {debt.usd > 0 && (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-red-600 font-medium">
                  ${debt.usd.toFixed(2)} USD
                </span>
              </div>
            )}
            {debt.cdf > 0 && (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-red-600 font-medium">
                  {debt.cdf.toFixed(0)} FC CDF
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-green-600">Solde à jour</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(customer)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddPayment(customer)}
            title="Ajouter un paiement"
          >
            <CreditCard className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isCustomerDetailDialogOpen, setIsCustomerDetailDialogOpen] =
    useState(false);

  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    customerId: "",
    amount: 0,
    currency: Currency.USD,
  });
  const [selectedCustomerDebt, setSelectedCustomerDebt] = useState<{
    usd: number;
    cdf: number;
  } | null>(null);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        // Charger les clients en premier (données principales)
        setIsLoadingCustomers(true);
        const customersResponse = await fetch("/api/customers");
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData);
        }
        setIsLoadingCustomers(false);

        // Charger les ventes (nécessaires pour calculer les dettes)
        setIsLoadingSales(true);
        const salesResponse = await fetch("/api/sales");
        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(salesData);
        }
        setIsLoadingSales(false);

        // Charger les paiements (nécessaires pour calculer les dettes)
        setIsLoadingPayments(true);
        const paymentsResponse = await fetch("/api/payments");
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          setPayments(paymentsData);
        }
        setIsLoadingPayments(false);

        // Charger les produits (nécessaires pour les détails)
        const productsResponse = await fetch("/api/products");
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoadingCustomers(false);
        setIsLoadingSales(false);
        setIsLoadingPayments(false);
      }
    };

    loadData();
  }, [router]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCustomer(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création du client"
        );
      }

      const newCustomer = await response.json();
      setCustomers((prevCustomers) => [newCustomer, ...prevCustomers]);
      setCustomerFormData({ name: "", phone: "" });
      setIsAddCustomerDialogOpen(false);
    } catch (error) {
      console.error("Error creating customer:", error);
      alert(
        `Erreur lors de la création du client: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleCustomerSelection = (customerId: string) => {
    setPaymentFormData({
      ...paymentFormData,
      customerId,
    });

    if (customerId) {
      const debt = calculateCustomerDebt(customerId);
      setSelectedCustomerDebt(debt);

      // Set default currency based on which debt is higher
      if (debt.usd > 0 && debt.cdf > 0) {
        // If both currencies have debt, default to USD
        setPaymentFormData((prev) => ({
          ...prev,
          customerId,
          currency: Currency.USD,
        }));
      } else if (debt.usd > 0) {
        setPaymentFormData((prev) => ({
          ...prev,
          customerId,
          currency: Currency.USD,
        }));
      } else if (debt.cdf > 0) {
        setPaymentFormData((prev) => ({
          ...prev,
          customerId,
          currency: Currency.CDF,
        }));
      }
    } else {
      setSelectedCustomerDebt(null);
    }
  };

  const handleAddPaymentForCustomer = (customer: CustomerWithRelations) => {
    const debt = calculateCustomerDebt(customer.id);
    setSelectedCustomerDebt(debt);

    // Déterminer la devise par défaut basée sur la dette la plus élevée
    let defaultCurrency = Currency.USD;
    if (debt.cdf > debt.usd) {
      defaultCurrency = Currency.CDF;
    }

    setPaymentFormData({
      customerId: customer.id,
      amount: 0,
      currency: defaultCurrency,
    });
    // Ouvrir le popup d'ajout de paiement
    setIsAddPaymentDialogOpen(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayment(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création du paiement"
        );
      }

      const newPayment = await response.json();
      setPayments((prevPayments) => [newPayment, ...prevPayments]);
      setPaymentFormData({
        customerId: "",
        amount: 0,
        currency: Currency.USD,
      });
      setSelectedCustomerDebt(null);
      setIsAddPaymentDialogOpen(false);
    } catch (error) {
      console.error("Error creating payment:", error);
      alert(
        `Erreur lors de la création du paiement: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getCustomerDebtData = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/debt`);
      if (response.ok) {
        return await response.json();
      }
      return { usd: 0, cdf: 0 };
    } catch (error) {
      console.error("Error getting customer debt:", error);
      return { usd: 0, cdf: 0 };
    }
  };

  const getCustomerSales = (customerId: string) => {
    return sales.filter((s) => s.customerId === customerId);
  };

  const getCustomerPayments = (customerId: string) => {
    return payments
      .filter((p) => p.customerId === customerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  // Filtrer les clients par terme de recherche et date
  const filteredCustomers = customers.filter((customer) => {
    const customerDate = new Date(customer.createdAt)
      .toISOString()
      .split("T")[0];

    // Filtre par date
    const dateMatch = selectedDate ? customerDate === selectedDate : true;

    // Filtre par terme de recherche
    const searchMatch = searchTerm
      ? customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    return dateMatch && searchMatch;
  });

  const getCustomerDebtDetails = (customerId: string) => {
    const customerSales = sales.filter(
      (sale) => sale.customerId === customerId && sale.isCredit
    );
    const customerPayments = payments.filter(
      (payment) => payment.customerId === customerId
    );

    // Calculate total payments by currency
    let totalPaymentsUSD = 0;
    let totalPaymentsCDF = 0;

    customerPayments.forEach((payment) => {
      if (payment.currency === "USD") {
        totalPaymentsUSD += payment.amount;
      } else {
        totalPaymentsCDF += payment.amount;
      }
    });

    // Calculate remaining debt for each sale
    const debtDetails = [];
    let remainingPaymentsUSD = totalPaymentsUSD;
    let remainingPaymentsCDF = totalPaymentsCDF;

    // Process USD sales first
    const usdSales = customerSales.filter((sale) => sale.currency === "USD");
    for (const sale of usdSales) {
      const remainingDebt = Math.max(0, sale.total - remainingPaymentsUSD);
      if (remainingDebt > 0) {
        debtDetails.push({
          sale,
          remainingDebt,
          currency: "USD",
        });
        remainingPaymentsUSD = Math.max(0, remainingPaymentsUSD - sale.total);
      }
    }

    // Process CDF sales
    const cdfSales = customerSales.filter((sale) => sale.currency === "CDF");
    for (const sale of cdfSales) {
      const remainingDebt = Math.max(0, sale.total - remainingPaymentsCDF);
      if (remainingDebt > 0) {
        debtDetails.push({
          sale,
          remainingDebt,
          currency: "CDF",
        });
        remainingPaymentsCDF = Math.max(0, remainingPaymentsCDF - sale.total);
      }
    }

    return debtDetails;
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

  const viewCustomerDetailsForCustomer = (customer: CustomerWithRelations) => {
    setSelectedCustomer(customer);
    setIsCustomerDetailDialogOpen(true);
  };

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDetailDialogOpen(true);
  };

  // Calculate debt from sales and payments
  const calculateCustomerDebt = (customerId: string) => {
    const customerSales = sales.filter(
      (sale) => sale.customerId === customerId && sale.isCredit
    );
    const customerPayments = payments.filter(
      (payment) => payment.customerId === customerId
    );

    let totalSalesUSD = 0;
    let totalSalesCDF = 0;
    let totalPaymentsUSD = 0;
    let totalPaymentsCDF = 0;

    customerSales.forEach((sale) => {
      if (sale.currency === "USD") {
        totalSalesUSD += sale.total;
      } else {
        totalSalesCDF += sale.total;
      }
    });

    customerPayments.forEach((payment) => {
      if (payment.currency === "USD") {
        totalPaymentsUSD += payment.amount;
      } else {
        totalPaymentsCDF += payment.amount;
      }
    });

    return {
      usd: Math.max(0, totalSalesUSD - totalPaymentsUSD),
      cdf: Math.max(0, totalSalesCDF - totalPaymentsCDF),
    };
  };

  const customersWithDebt = filteredCustomers.filter((customer) => {
    const debt = calculateCustomerDebt(customer.id);
    return debt.usd > 0 || debt.cdf > 0;
  });

  const totalDebtUSD = customers.reduce((sum, customer) => {
    return sum + calculateCustomerDebt(customer.id).usd;
  }, 0);

  const totalDebtCDF = customers.reduce((sum, customer) => {
    return sum + calculateCustomerDebt(customer.id).cdf;
  }, 0);

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
                    Clients
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Gérez vos clients et leurs dettes
                  </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Dialog
                    open={isAddPaymentDialogOpen}
                    onOpenChange={setIsAddPaymentDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Enregistrer un paiement</span>
                        <span className="sm:hidden">Paiement</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enregistrer un paiement</DialogTitle>
                        <DialogDescription>
                          Enregistrez un paiement reçu d'un client
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddPayment} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer">Client</Label>
                          <Select
                            value={paymentFormData.customerId}
                            onValueChange={handleCustomerSelection}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un client" />
                            </SelectTrigger>
                            <SelectContent>
                              {customersWithDebt.map((customer) => (
                                <SelectItem
                                  key={customer.id}
                                  value={customer.id}
                                >
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Afficher la dette du client sélectionné */}
                          {selectedCustomerDebt && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Dette actuelle du client :
                              </p>
                              <div className="space-y-1">
                                {selectedCustomerDebt.usd > 0 ? (
                                  <p className="text-sm">
                                    <span className="font-medium">USD:</span>{" "}
                                    <span className="text-destructive font-medium">
                                      ${selectedCustomerDebt.usd.toFixed(2)}
                                    </span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">USD:</span>{" "}
                                    Aucune dette
                                  </p>
                                )}
                                {selectedCustomerDebt.cdf > 0 ? (
                                  <p className="text-sm">
                                    <span className="font-medium">CDF:</span>{" "}
                                    <span className="text-destructive font-medium">
                                      {selectedCustomerDebt.cdf.toFixed(0)} FC
                                    </span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">CDF:</span>{" "}
                                    Aucune dette
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="amount">Montant</Label>
                              {selectedCustomerDebt && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const debtAmount =
                                      paymentFormData.currency === Currency.USD
                                        ? selectedCustomerDebt.usd
                                        : selectedCustomerDebt.cdf;
                                    setPaymentFormData({
                                      ...paymentFormData,
                                      amount: debtAmount,
                                    });
                                  }}
                                  className="text-xs"
                                >
                                  Remplir dette totale
                                </Button>
                              )}
                            </div>
                            <Input
                              id="amount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentFormData.amount}
                              onChange={(e) =>
                                setPaymentFormData({
                                  ...paymentFormData,
                                  amount:
                                    Number.parseFloat(e.target.value) || 0,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="currency">Devise</Label>
                            <Select
                              value={paymentFormData.currency}
                              onValueChange={(value) => {
                                const newCurrency = value as Currency;
                                setPaymentFormData({
                                  ...paymentFormData,
                                  currency: newCurrency,
                                  // Reset amount when changing currency
                                  amount: 0,
                                });
                              }}
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
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsAddPaymentDialogOpen(false);
                              setPaymentFormData({
                                customerId: "",
                                amount: 0,
                                currency: Currency.USD,
                              });
                              setSelectedCustomerDebt(null);
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              !paymentFormData.customerId ||
                              paymentFormData.amount <= 0 ||
                              isSubmittingPayment
                            }
                          >
                            {isSubmittingPayment ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>En cours...</span>
                              </div>
                            ) : (
                              "Enregistrer le paiement"
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isAddCustomerDialogOpen}
                    onOpenChange={setIsAddCustomerDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Nouveau client</span>
                        <span className="sm:hidden">Nouveau</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un client</DialogTitle>
                        <DialogDescription>
                          Créez un nouveau client dans votre base de données
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nom du client</Label>
                          <Input
                            id="name"
                            value={customerFormData.name}
                            onChange={(e) =>
                              setCustomerFormData({
                                ...customerFormData,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ex: Jean Dupont"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Téléphone (optionnel)</Label>
                          <Input
                            id="phone"
                            value={customerFormData.phone}
                            onChange={(e) =>
                              setCustomerFormData({
                                ...customerFormData,
                                phone: e.target.value,
                              })
                            }
                            placeholder="Ex: +243 123 456 789"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsAddCustomerDialogOpen(false);
                              setCustomerFormData({ name: "", phone: "" });
                            }}
                          >
                            Annuler
                          </Button>
                          <Button type="submit" disabled={isSubmittingCustomer}>
                            {isSubmittingCustomer ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>En cours...</span>
                              </div>
                            ) : (
                              "Ajouter le client"
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Barre de recherche et filtre de date */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      placeholder="Rechercher un client..."
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

              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total clients
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customers.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Clients enregistrés
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Clients endettés
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {customersWithDebt.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ont des dettes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dette totale USD
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${totalDebtUSD.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">À recouvrer</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dette totale CDF
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {totalDebtCDF.toFixed(0)} FC
                    </div>
                    <p className="text-xs text-muted-foreground">À recouvrer</p>
                  </CardContent>
                </Card>
              </div>

              {/* Indicateur de résultats de recherche */}
              {(searchTerm || selectedDate) && (
                <div className="text-sm text-muted-foreground">
                  {filteredCustomers.length} client
                  {filteredCustomers.length > 1 ? "s" : ""} trouvé
                  {filteredCustomers.length > 1 ? "s" : ""}
                  {searchTerm && ` pour "${searchTerm}"`}
                  {selectedDate &&
                    ` le ${new Date(selectedDate).toLocaleDateString("fr-FR")}`}
                </div>
              )}

              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">Tous les clients</TabsTrigger>
                  <TabsTrigger value="debt">Clients endettés</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Liste des clients
                      </CardTitle>
                      <CardDescription>
                        {customers.length} client
                        {customers.length > 1 ? "s" : ""} enregistré
                        {customers.length > 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Nom</TableHead>
                              <TableHead className="whitespace-nowrap">Téléphone</TableHead>
                              <TableHead className="whitespace-nowrap">Nombre de ventes</TableHead>
                              <TableHead className="whitespace-nowrap">Dette</TableHead>
                              <TableHead className="whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {isLoadingCustomers ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-muted-foreground py-8"
                              >
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  <span>Chargement des clients...</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {filteredCustomers.map((customer) => {
                                const debt = calculateCustomerDebt(customer.id);
                                const customerSalesCount = getCustomerSales(
                                  customer.id
                                ).length;
                                return (
                                  <CustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    onViewDetails={
                                      viewCustomerDetailsForCustomer
                                    }
                                    onAddPayment={handleAddPaymentForCustomer}
                                  />
                                );
                              })}
                              {customers.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    Aucun client enregistré
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
                </TabsContent>

                <TabsContent value="debt">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Clients endettés
                      </CardTitle>
                      <CardDescription>
                        {customersWithDebt.length} client
                        {customersWithDebt.length > 1 ? "s" : ""} avec des
                        dettes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Nom</TableHead>
                              <TableHead className="whitespace-nowrap">Téléphone</TableHead>
                              <TableHead className="whitespace-nowrap">Dette USD</TableHead>
                              <TableHead className="whitespace-nowrap">Dette CDF</TableHead>
                              <TableHead className="whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {customersWithDebt.map((customer) => {
                            const debt = calculateCustomerDebt(customer.id);
                            const debtDetails = getCustomerDebtDetails(
                              customer.id
                            );
                            return (
                              <CustomerRow
                                key={customer.id}
                                customer={customer}
                                onViewDetails={viewCustomerDetailsForCustomer}
                                onAddPayment={handleAddPaymentForCustomer}
                              />
                            );
                          })}
                          {customersWithDebt.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-muted-foreground py-8"
                              >
                                Aucun client endetté
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>

        {/* Customer Detail Dialog */}
        <Dialog
          open={isCustomerDetailDialogOpen}
          onOpenChange={setIsCustomerDetailDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du client</DialogTitle>
              <DialogDescription>
                Historique des ventes et paiements
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Informations client
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p>
                          <strong>Nom:</strong> {selectedCustomer.name}
                        </p>
                        <p>
                          <strong>Téléphone:</strong>{" "}
                          {selectedCustomer.phone || "Non renseigné"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dette actuelle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(() => {
                          const debt = calculateCustomerDebt(
                            selectedCustomer.id
                          );
                          const debtDetails = getCustomerDebtDetails(
                            selectedCustomer.id
                          );
                          return (
                            <>
                              <div className="space-y-2">
                                <p>
                                  <strong>USD:</strong>{" "}
                                  <span
                                    className={
                                      debt.usd > 0
                                        ? "text-destructive font-medium"
                                        : ""
                                    }
                                  >
                                    ${debt.usd.toFixed(2)}
                                  </span>
                                </p>
                                <p>
                                  <strong>CDF:</strong>{" "}
                                  <span
                                    className={
                                      debt.cdf > 0
                                        ? "text-destructive font-medium"
                                        : ""
                                    }
                                  >
                                    {debt.cdf.toFixed(0)} FC
                                  </span>
                                </p>
                              </div>

                              {debtDetails.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm text-muted-foreground">
                                    Détails de la dette:
                                  </h4>
                                  <div className="space-y-2">
                                    {debtDetails.map((debtItem, index) => (
                                      <div
                                        key={index}
                                        className="p-3 bg-muted rounded-lg"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-medium text-sm">
                                              Facture:{" "}
                                              {debtItem.sale.invoiceNumber}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatDate(
                                                debtItem.sale.createdAt
                                              )}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-medium">
                                              {debtItem.remainingDebt.toFixed(
                                                2
                                              )}{" "}
                                              {debtItem.currency}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Afficher les produits de cette vente */}
                                        {debtItem.sale.items &&
                                          debtItem.sale.items.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                              <p className="text-xs font-medium text-muted-foreground">
                                                Produits:
                                              </p>
                                              {debtItem.sale.items.map(
                                                (
                                                  item: any,
                                                  itemIndex: number
                                                ) => {
                                                  const product = products.find(
                                                    (p) =>
                                                      p.id === item.productId
                                                  );
                                                  return (
                                                    <div
                                                      key={itemIndex}
                                                      className="text-xs ml-2"
                                                    >
                                                      •{" "}
                                                      {product?.name ||
                                                        "Produit inconnu"}
                                                      (Qty: {item.quantity}{" "}
                                                      {item.saleUnit}) -{" "}
                                                      {item.unitPrice.toFixed(
                                                        2
                                                      )}{" "}
                                                      {debtItem.currency}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="sales" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="sales">Ventes</TabsTrigger>
                    <TabsTrigger value="payments">Paiements</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales">
                    <Card>
                      <CardHeader>
                        <CardTitle>Historique des ventes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Facture</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getCustomerSales(selectedCustomer.id).map(
                              (sale) => (
                                <TableRow key={sale.id}>
                                  <TableCell>
                                    {formatDate(sale.createdAt)}
                                  </TableCell>
                                  <TableCell>{sale.invoiceNumber}</TableCell>
                                  <TableCell>
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
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="payments">
                    <Card>
                      <CardHeader>
                        <CardTitle>Historique des paiements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Montant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getCustomerPayments(selectedCustomer.id).map(
                              (payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell>
                                    {formatDate(payment.createdAt)}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {payment.amount.toFixed(2)}{" "}
                                    {payment.currency}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthRoute>
  );
}
