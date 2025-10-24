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
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import "@/styles/print.css";
// import { formatCurrency } from "@/lib/utils";

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

  // Fonction locale pour formater les devises
  const formatCurrency = (amount: number, currency: string): string => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`;
    } else {
      return `${amount.toLocaleString()} FC`;
    }
  };

  // Fonction pour imprimer le rapport en PDF
  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalProfit = profitData
      ? profitData.productProfits.reduce((sum, item) => sum + item.profit, 0) -
        profitData.summary.totalExpensesInUSD -
        profitData.summary.totalDebtsInUSD
      : 0;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport Journalier - ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .report-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .report-date { font-size: 14px; color: #666; }
            .section-title { font-size: 14px; font-weight: bold; margin: 15px 0 8px 0; color: #333; }
            .profit-total { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; padding: 10px; border: 2px solid #000; background-color: #f0f8f0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .stock-alert { margin-bottom: 8px; padding: 4px; border: 1px solid #000; }
            .stock-alert.rupture { background-color: #ffebee; }
            .stock-alert.faible { background-color: #fff8e1; }
            .expense-item, .debt-item { margin-bottom: 4px; padding: 2px 4px; border: 1px solid #ccc; }
            .report-footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
            @media print { body { margin: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="report-title">💰 RAPPORT JOURNALIER</div>
            <div class="report-date">Date: ${selectedDate}</div>
          </div>

          <div class="profit-total">
            BÉNÉFICE TOTAL: $${totalProfit.toFixed(2)} USD
          </div>

          <div class="section-title">📊 RÉSUMÉ DES VENTES</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="text-align: center; flex: 1; margin: 0 10px; padding: 10px; border: 1px solid #000; background-color: #e3f2fd;">
              <div style="font-size: 16px; font-weight: bold; color: #1976d2;">
                $${
                  profitData
                    ? profitData.summary.totalSalesUSD.toFixed(2)
                    : "0.00"
                }
              </div>
              <div style="font-size: 12px; color: #666;">Ventes en USD</div>
            </div>
            <div style="text-align: center; flex: 1; margin: 0 10px; padding: 10px; border: 1px solid #000; background-color: #e8f5e8;">
              <div style="font-size: 16px; font-weight: bold; color: #388e3c;">
                ${
                  profitData
                    ? profitData.summary.totalSalesCDF.toLocaleString()
                    : "0"
                } FC
              </div>
              <div style="font-size: 12px; color: #666;">Ventes en CDF</div>
            </div>
          </div>
          <div style="text-align: center; margin: 10px 0; padding: 8px; background-color: #f5f5f5; border: 1px solid #ccc;">
            <div style="font-size: 14px; font-weight: bold;">
              Total Ventes: $${
                profitData
                  ? profitData.summary.totalSalesInUSD.toFixed(2)
                  : "0.00"
              } USD
            </div>
            <div style="font-size: 10px; color: #666;">(Toutes devises converties en USD)</div>
          </div>

          ${
            profitData && profitData.outOfStockProducts.length > 0
              ? `
            <div class="section-title">⚠️ PRODUITS EN RUPTURE DE STOCK</div>
            ${profitData.outOfStockProducts
              .map(
                (product) => `
              <div class="stock-alert rupture">
                ${product.name} - Stock: ${product.stock} ${product.saleUnit}
              </div>
            `
              )
              .join("")}
          `
              : ""
          }

          ${
            profitData && profitData.lowStockProducts.length > 0
              ? `
            <div class="section-title">⚡ PRODUITS EN STOCK FAIBLE</div>
            ${profitData.lowStockProducts
              .map(
                (product) => `
              <div class="stock-alert faible">
                ${product.name} - Stock: ${product.stock} ${product.saleUnit}
              </div>
            `
              )
              .join("")}
          `
              : ""
          }

          ${
            profitData && profitData.productProfits.length > 0
              ? `
            <div class="section-title">📊 BÉNÉFICE PAR PRODUIT</div>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Prix Vente (USD)</th>
                  <th>Coût Unitaire (USD)</th>
                  <th>Bénéfice (USD)</th>
                </tr>
              </thead>
              <tbody>
                ${profitData.productProfits
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.productName} (${item.saleUnit})</td>
                    <td>${item.quantity}</td>
                    <td>$${item.salePriceUSD.toFixed(2)}</td>
                    <td>$${item.unitCost.toFixed(2)}</td>
                    <td>$${item.profit.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : ""
          }

          ${
            profitData && profitData.expenses.length > 0
              ? `
            <div class="section-title">💸 DÉPENSES JOURNALIÈRES</div>
            <div>Total: $${profitData.summary.totalExpensesInUSD.toFixed(
              2
            )} USD</div>
            ${profitData.expenses
              .map(
                (expense) => `
              <div class="expense-item">
                ${expense.description} - ${formatCurrency(
                  expense.amount,
                  expense.currency
                )}
              </div>
            `
              )
              .join("")}
          `
              : ""
          }

          ${
            profitData && profitData.creditSales.length > 0
              ? `
            <div class="section-title">🏦 DETTES (VENTES À CRÉDIT)</div>
            <div>Total: $${profitData.summary.totalDebtsInUSD.toFixed(
              2
            )} USD</div>
            ${profitData.creditSales
              .map(
                (sale) => `
              <div class="debt-item">
                ${sale.customer?.name || "Client anonyme"} - ${formatCurrency(
                  sale.total,
                  sale.currency
                )}
              </div>
            `
              )
              .join("")}
          `
              : ""
          }

          <div class="report-footer">
            Rapport généré le ${new Date().toLocaleString("fr-FR")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

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
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
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
                  {isLoading || isLoadingProfit
                    ? "Chargement..."
                    : "Actualiser"}
                </Button>
                <Button
                  onClick={printReport}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  📄 Imprimer PDF
                </Button>
              </div>
            </div>

            {/* Alertes de Stock */}
            {profitData &&
              (profitData.outOfStockProducts.length > 0 ||
                profitData.lowStockProducts.length > 0) && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-center text-orange-600">
                      ⚠️ Alertes de Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Produits en Rupture */}
                      {profitData.outOfStockProducts.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-red-600">
                            🚫 En Rupture (
                            {profitData.outOfStockProducts.length})
                          </h4>
                          <div className="space-y-1">
                            {profitData.outOfStockProducts.map(
                              (product: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-2 bg-red-50 rounded border border-red-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-red-800">
                                      {product.name}
                                    </span>
                                    <span className="text-xs text-red-600">
                                      Stock: {product.stock} {product.saleUnit}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stock Faible */}
                      {profitData.lowStockProducts.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-yellow-600">
                            ⚡ Stock Faible (
                            {profitData.lowStockProducts.length})
                          </h4>
                          <div className="space-y-1">
                            {profitData.lowStockProducts.map(
                              (product: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-2 bg-yellow-50 rounded border border-yellow-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-yellow-800">
                                      {product.name}
                                    </span>
                                    <span className="text-xs text-yellow-600">
                                      Stock: {product.stock} {product.saleUnit}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Bénéfice Journalier Simplifié */}
            {profitData && (
              <div className="space-y-6">
                {/* Bénéfice Total Calculé */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center text-green-600">
                      💰 Bénéfice Total Journalier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-emerald-600 mb-2">
                        $
                        {(
                          profitData.productProfits.reduce(
                            (sum, item) => sum + item.profit,
                            0
                          ) -
                          profitData.summary.totalExpensesInUSD -
                          profitData.summary.totalDebtsInUSD
                        ).toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Σ(Bénéfices par produit) - Dépenses - Dettes
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Résumé des Ventes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center text-blue-600">
                      📊 Résumé des Ventes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ventes en USD */}
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          ${profitData.summary.totalSalesUSD.toFixed(2)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ventes en USD
                        </p>
                      </div>

                      {/* Ventes en CDF */}
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {profitData.summary.totalSalesCDF.toLocaleString()} FC
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ventes en CDF
                        </p>
                      </div>
                    </div>

                    {/* Total des ventes converti en USD */}
                    <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-700">
                        Total Ventes: $
                        {profitData.summary.totalSalesInUSD.toFixed(2)} USD
                      </div>
                      <p className="text-xs text-muted-foreground">
                        (Toutes devises converties en USD)
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
                                      (
                                      {formatCurrency(
                                        item.salePrice,
                                        item.currency
                                      )}
                                      )
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    ${item.unitCost.toFixed(2)}
                                  </TableCell>
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
                          {profitData.expenses.map(
                            (expense: any, index: number) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <p className="font-medium">
                                    {expense.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(
                                      expense.createdAt
                                    ).toLocaleTimeString("fr-FR")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">
                                    {formatCurrency(
                                      expense.amount,
                                      expense.currency
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    $
                                    {(expense.currency === "USD"
                                      ? expense.amount
                                      : expense.amount /
                                        profitData.summary.exchangeRate
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
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
                          {profitData.creditSales.map(
                            (sale: any, index: number) => (
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
                                    {new Date(
                                      sale.createdAt
                                    ).toLocaleTimeString("fr-FR")}
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
                                      : sale.total /
                                        profitData.summary.exchangeRate
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
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
                                <div className="text-red-600 font-bold">
                                  Rupture
                                </div>
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
        </main>
      </div>
    </div>
  );
}
