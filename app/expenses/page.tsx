"use client";

import type React from "react";

import { useState, useEffect } from "react";
// Removed direct database imports - using API routes instead
import { Currency } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function ExpensesPage() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(Currency.USD);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const response = await fetch("/api/expenses");
        if (response.ok) {
          const expensesData = await response.json();
          setExpenses(expensesData);
        }
      } catch (error) {
        console.error("Error loading expenses:", error);
      }
    };
    loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          currency,
        }),
      });

      if (response.ok) {
        // Reload expenses
        const expensesResponse = await fetch("/api/expenses");
        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          setExpenses(expensesData);
        }
        setDescription("");
        setAmount("");
        setCurrency(Currency.USD);
      } else {
        console.error("Error adding expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce(
    (acc, expense) => {
      if (expense.currency === Currency.USD) {
        acc.usd += expense.amount;
      } else {
        acc.cdf += expense.amount;
      }
      return acc;
    },
    { usd: 0, cdf: 0 }
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Dépenses</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Dépenses USD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    ${totalExpenses.usd.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Dépenses CDF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {totalExpenses.cdf.toLocaleString()} CDF
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Nombre de Dépenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {expenses.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ajouter une Dépense</CardTitle>
                  <CardDescription>
                    Enregistrer une nouvelle dépense
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Description de la dépense..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Montant</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Devise</Label>
                        <Select
                          value={currency}
                          onValueChange={(value) =>
                            setCurrency(value as Currency)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={Currency.USD}>USD</SelectItem>
                            <SelectItem value={Currency.CDF}>CDF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? "Ajout..." : "Ajouter la Dépense"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dépenses Récentes</CardTitle>
                  <CardDescription>
                    Les 5 dernières dépenses enregistrées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .slice(0, 5)
                      .map((expense) => (
                        <div
                          key={expense.id}
                          className="flex justify-between items-start p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {expense.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.createdAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-400">
                              {expense.currency === Currency.USD
                                ? `$${expense.amount.toFixed(2)}`
                                : `${expense.amount.toLocaleString()} CDF`}
                            </p>
                          </div>
                        </div>
                      ))}
                    {expenses.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        Aucune dépense enregistrée
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historique des Dépenses</CardTitle>
                <CardDescription>
                  Toutes les dépenses enregistrées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Devise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {new Date(expense.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            {expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                expense.currency === Currency.USD
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {expense.currency}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
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
