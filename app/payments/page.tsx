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
import {
  getPayments,
  createPayment,
  getCustomers,
  getCustomerDebt,
} from "@/lib/database";
import { Currency } from "@/lib/types";
import type { Payment, Customer } from "@prisma/client";
import { Plus, CreditCard, DollarSign } from "lucide-react";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    amount: 0,
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
        const [paymentsData, customersData] = await Promise.all([
          getPayments(),
          getCustomers(),
        ]);
        setPayments(paymentsData);
        setCustomers(customersData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPayment(formData);
      const paymentsData = await getPayments();
      setPayments(paymentsData);
      setFormData({ customerId: "", amount: 0, currency: Currency.USD });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };

  const getCustomerName = (customerId: string) => {
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

  const [customersWithDebt, setCustomersWithDebt] = useState<Customer[]>([]);

  useEffect(() => {
    const loadCustomersWithDebt = async () => {
      const customersWithDebtData = [];
      for (const customer of customers) {
        try {
          const debt = await getCustomerDebt(customer.id);
          if (debt.usd > 0 || debt.cdf > 0) {
            customersWithDebtData.push(customer);
          }
        } catch (error) {
          console.error("Error getting customer debt:", error);
        }
      }
      setCustomersWithDebt(customersWithDebtData);
    };

    if (customers.length > 0) {
      loadCustomersWithDebt();
    }
  }, [customers]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Paiements
                </h1>
                <p className="text-muted-foreground">
                  Gérez les paiements reçus des clients
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau paiement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enregistrer un paiement</DialogTitle>
                    <DialogDescription>
                      Enregistrez un paiement reçu d'un client
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Client</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customerId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un client" />
                        </SelectTrigger>
                        <SelectContent>
                          {customersWithDebt.map((customer) => {
                            const debt = dataStore.getCustomerDebt(customer.id);
                            return (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} (Dette: ${debt.usd.toFixed(2)} /{" "}
                                {debt.cdf.toFixed(0)} FC)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Montant</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              amount: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
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
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setFormData({
                            customerId: "",
                            amount: 0,
                            currency: Currency.USD,
                          });
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={!formData.customerId || formData.amount <= 0}
                      >
                        Enregistrer le paiement
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
                    Total paiements
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{payments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Paiements reçus
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Paiements USD
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {payments
                      .filter((p) => p.currency === Currency.USD)
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Reçus en USD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Paiements CDF
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payments
                      .filter((p) => p.currency === Currency.CDF)
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toFixed(0)}{" "}
                    FC
                  </div>
                  <p className="text-xs text-muted-foreground">Reçus en CDF</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Historique des paiements
                </CardTitle>
                <CardDescription>
                  {payments.length} paiement{payments.length > 1 ? "s" : ""}{" "}
                  enregistré{payments.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .slice()
                      .reverse()
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {getCustomerName(payment.customerId)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.amount.toFixed(2)} {payment.currency}
                          </TableCell>
                        </TableRow>
                      ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucun paiement enregistré
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
