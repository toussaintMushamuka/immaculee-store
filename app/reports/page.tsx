"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dailyData, setDailyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDailyTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reports/daily-transactions?date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      } else {
        console.error("Error loading daily transactions");
      }
    } catch (error) {
      console.error("Error loading daily transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDailyTransactions();
  }, [selectedDate]);

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`;
    } else {
      return `${amount.toLocaleString()} CDF`;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
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
              <h1 className="text-3xl font-bold text-foreground">
                Rapport Journalier
              </h1>
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="date">Date du rapport</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button onClick={loadDailyTransactions} disabled={isLoading}>
                  {isLoading ? "Chargement..." : "Actualiser"}
                </Button>
                {dailyData && (
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/reports/daily-transactions/pdf?date=${selectedDate}`,
                        "_blank"
                      )
                    }
                    variant="outline"
                  >
                    Imprimer PDF
                  </Button>
                )}
              </div>
            </div>

            {dailyData && (
              <div className="space-y-6">
                {/* Total Sales Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">
                      Total des Ventes Journalières
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      {/* Ventes en CDF */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Ventes en CDF
                        </p>
                        <div className="text-2xl font-bold text-blue-400">
                          {dailyData.transactions.sales
                            .filter((sale: any) => sale.currency === "CDF")
                            .reduce(
                              (sum: number, sale: any) => sum + sale.total,
                              0
                            )
                            .toLocaleString()}{" "}
                          CDF
                        </div>
                      </div>

                      {/* Ventes en USD */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Ventes en USD
                        </p>
                        <div className="text-2xl font-bold text-green-400">
                          $
                          {dailyData.transactions.sales
                            .filter((sale: any) => sale.currency === "USD")
                            .reduce(
                              (sum: number, sale: any) => sum + sale.total,
                              0
                            )
                            .toFixed(2)}
                        </div>
                      </div>

                      {/* Total converti en USD */}
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-1">
                          Total en USD
                        </p>
                        <div className="text-4xl font-bold text-emerald-400">
                          ${dailyData.summary.totalSalesUSD.toFixed(2)}
                        </div>
                      </div>

                      <p className="text-muted-foreground">
                        {dailyData.transactions.sales.length} vente
                        {dailyData.transactions.sales.length > 1
                          ? "s"
                          : ""}{" "}
                        enregistrée
                        {dailyData.transactions.sales.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Taux de change: 1 USD ={" "}
                        {dailyData.exchangeRate.toLocaleString()} CDF
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Transactions Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Ventes
                        <Badge variant="secondary">
                          {dailyData.transactions.sales.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyData.transactions.sales.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Aucune vente
                          </p>
                        ) : (
                          dailyData.transactions.sales.map((sale: any) => (
                            <div
                              key={sale.id}
                              className="border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {sale.invoiceNumber || "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {sale.customer}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">
                                    {formatCurrency(sale.total, sale.currency)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(sale.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {sale.isCredit && (
                                <Badge
                                  variant="outline"
                                  className="text-orange-600"
                                >
                                  À crédit
                                </Badge>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {sale.items.map((item: any, index: number) => (
                                  <div key={index}>
                                    {item.quantity} {item.saleUnit}{" "}
                                    {item.product} -{" "}
                                    {formatCurrency(item.total, sale.currency)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Purchases */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Achats
                        <Badge variant="secondary">
                          {dailyData.transactions.purchases.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyData.transactions.purchases.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Aucun achat
                          </p>
                        ) : (
                          dailyData.transactions.purchases.map(
                            (purchase: any) => (
                              <div
                                key={purchase.id}
                                className="border rounded-lg p-3 space-y-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {purchase.product}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {purchase.supplier}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">
                                      {formatCurrency(
                                        purchase.total,
                                        purchase.currency
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(purchase.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {purchase.quantity} unités ×{" "}
                                  {formatCurrency(
                                    purchase.unitPrice,
                                    purchase.currency
                                  )}
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Paiements
                        <Badge variant="secondary">
                          {dailyData.transactions.payments.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyData.transactions.payments.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Aucun paiement
                          </p>
                        ) : (
                          dailyData.transactions.payments.map(
                            (payment: any) => (
                              <div
                                key={payment.id}
                                className="border rounded-lg p-3 space-y-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {payment.customer}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-emerald-600">
                                      {formatCurrency(
                                        payment.amount,
                                        payment.currency
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(payment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expenses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Dépenses
                        <Badge variant="secondary">
                          {dailyData.transactions.expenses.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyData.transactions.expenses.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Aucune dépense
                          </p>
                        ) : (
                          dailyData.transactions.expenses.map(
                            (expense: any) => (
                              <div
                                key={expense.id}
                                className="border rounded-lg p-3 space-y-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {expense.description}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-red-600">
                                      {formatCurrency(
                                        expense.amount,
                                        expense.currency
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(expense.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {!dailyData && !isLoading && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Sélectionnez une date pour voir les transactions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
