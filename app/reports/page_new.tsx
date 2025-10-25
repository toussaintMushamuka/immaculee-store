"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface DailyTransaction {
  sales: any[];
  purchases: any[];
  expenses: any[];
}

interface DailyData {
  date: string;
  summary: {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
  };
  transactions: DailyTransaction;
}

interface ProfitData {
  date: string;
  summary: {
    totalSalesUSD: number;
    totalSalesCDF: number;
    totalSalesInUSD: number;
    totalCostUSD: number;
    totalCostCDF: number;
    totalCostInUSD: number;
    totalExpensesUSD: number;
    totalExpensesCDF: number;
    totalExpensesInUSD: number;
    totalDebtsUSD: number;
    totalDebtsCDF: number;
    totalDebtsInUSD: number;
    totalPaymentsUSD: number;
    totalPaymentsCDF: number;
    totalPaymentsInUSD: number;
    grossProfitUSD: number;
    grossProfitCDF: number;
    grossProfitInUSD: number;
    netProfitUSD: number;
    netProfitCDF: number;
    netProfitInUSD: number;
    exchangeRate: number;
  };
  salesCount: number;
  purchasesCount: number;
  expensesCount: number;
  creditSalesCount: number;
  paymentsCount: number;
  productProfits: any[];
  outOfStockProducts: any[];
  lowStockProducts: any[];
  sales: any[];
  purchases: any[];
  expenses: any[];
  creditSales: any[];
  payments: any[];
}

export default function ReportsPage() {
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const loadDailyTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reports/daily-transactions?date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      }
    } catch (error) {
      console.error("Error loading daily transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDailyProfit = async () => {
    setIsLoadingProfit(true);
    try {
      const response = await fetch(
        `/api/reports/daily-profit?date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setProfitData(data);
      }
    } catch (error) {
      console.error("Error loading daily profit:", error);
    } finally {
      setIsLoadingProfit(false);
    }
  };

  useEffect(() => {
    loadDailyTransactions();
    loadDailyProfit();
  }, [selectedDate]);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Rapports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Analyse des performances quotidiennes
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Button
            onClick={() => {
              loadDailyTransactions();
              loadDailyProfit();
            }}
            disabled={isLoading || isLoadingProfit}
          >
            {isLoading || isLoadingProfit ? "Chargement..." : "Actualiser"}
          </Button>
        </div>
      </div>

      {/* Bénéfice Journalier Simplifié */}
      {profitData && (
        <div className="space-y-6">
          {/* Bénéfice Total */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">
                💰 Bénéfice Total Journalier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">
                  ${profitData.summary.netProfitInUSD.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Bénéfice net après coûts, dépenses et dettes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bénéfice par produit */}
          {profitData.productProfits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  📊 Bénéfice par Produit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix Vente (USD)</TableHead>
                        <TableHead>Coût Unitaire (USD)</TableHead>
                        <TableHead>Bénéfice (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData.productProfits.map(
                        (item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.productName}
                              <div className="text-xs text-muted-foreground">
                                {item.saleUnit}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              ${item.salePriceUSD.toFixed(2)}
                              <div className="text-xs text-muted-foreground">
                                ({formatCurrency(item.salePrice, item.currency)}
                                )
                              </div>
                            </TableCell>
                            <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                            <TableCell
                              className={`font-bold ${
                                item.profit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              ${item.profit.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dépenses Journalières */}
          {profitData.expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-red-600">
                  💸 Dépenses Journalières
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-red-600">
                      ${profitData.summary.totalExpensesInUSD.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total des dépenses (USD)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {profitData.expenses.map((expense: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(expense.createdAt).toLocaleTimeString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            $
                            {(expense.currency === "USD"
                              ? expense.amount
                              : expense.amount / profitData.summary.exchangeRate
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dettes */}
          {profitData.creditSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-orange-600">
                  🏦 Dettes (Ventes à Crédit)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-orange-600">
                      ${profitData.summary.totalDebtsInUSD.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total des dettes (USD)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {profitData.creditSales.map((sale: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-orange-50 rounded"
                      >
                        <div>
                          <p className="font-medium">
                            {sale.customer?.name || "Client anonyme"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sale.invoiceNumber} -{" "}
                            {new Date(sale.createdAt).toLocaleTimeString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(sale.total, sale.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            $
                            {(sale.currency === "USD"
                              ? sale.total
                              : sale.total / profitData.summary.exchangeRate
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Produits en Rupture de Stock */}
          {profitData.outOfStockProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-red-600">
                  ⚠️ Produits en Rupture de Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profitData.outOfStockProducts.map(
                    (product: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-red-800">
                              {product.name}
                            </p>
                            <p className="text-xs text-red-600">
                              Stock: {product.stock} {product.saleUnit}
                            </p>
                          </div>
                          <div className="text-red-600 font-bold">Rupture</div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Produits en Stock Faible */}
          {profitData.lowStockProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-yellow-600">
                  ⚡ Produits en Stock Faible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profitData.lowStockProducts.map(
                    (product: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-yellow-800">
                              {product.name}
                            </p>
                            <p className="text-xs text-yellow-600">
                              Stock: {product.stock} {product.saleUnit}
                            </p>
                          </div>
                          <div className="text-yellow-600 font-bold">
                            Faible
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
