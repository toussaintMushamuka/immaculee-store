"use client";

import type React from "react";

import { useState, useEffect } from "react";
// Removed direct database imports - using API routes instead
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
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function ExchangeRatesPage() {
  const [usdToCdf, setUsdToCdf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [currentRate, setCurrentRate] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/api/exchange-rates");
        if (response.ok) {
          const data = await response.json();
          setExchangeRates(data.exchangeRates);
          setCurrentRate(data.currentRate);
        }
      } catch (error) {
        console.error("Error loading exchange rates:", error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usdToCdf || isNaN(Number(usdToCdf))) return;

    setIsSubmitting(true);

    try {
      const rate = Number(usdToCdf);
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: new Date(),
          usdToCdf: rate,
          cdfToUsd: 1 / rate,
        }),
      });

      if (response.ok) {
        // Reload data
        const dataResponse = await fetch("/api/exchange-rates");
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          setExchangeRates(data.exchangeRates);
          setCurrentRate(data.currentRate);
        }
        setUsdToCdf("");
      } else {
        console.error("Error adding exchange rate");
      }
    } catch (error) {
      console.error("Error adding exchange rate:", error);
    } finally {
      setIsSubmitting(false);
    }
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
                Taux de Change
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taux Actuel</CardTitle>
                  <CardDescription>
                    Dernière mise à jour du taux de change
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentRate ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">
                          1 USD =
                        </span>
                        <span className="text-2xl font-bold text-emerald-400">
                          {currentRate.usdToCdf.toLocaleString()} CDF
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">
                          1 CDF =
                        </span>
                        <span className="text-2xl font-bold text-amber-400">
                          ${currentRate.cdfToUsd.toFixed(6)} USD
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mis à jour le{" "}
                        {new Date(currentRate.createdAt).toLocaleDateString(
                          "fr-FR"
                        )}{" "}
                        à{" "}
                        {new Date(currentRate.createdAt).toLocaleTimeString(
                          "fr-FR"
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Aucun taux de change défini
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mettre à Jour le Taux</CardTitle>
                  <CardDescription>
                    Définir un nouveau taux de change USD vers CDF
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="usdToCdf">1 USD = ? CDF</Label>
                      <Input
                        id="usdToCdf"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 2800"
                        value={usdToCdf}
                        onChange={(e) => setUsdToCdf(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? "Mise à jour..." : "Mettre à Jour"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historique des Taux</CardTitle>
                <CardDescription>Évolution des taux de change</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Heure</TableHead>
                      <TableHead className="text-right">1 USD → CDF</TableHead>
                      <TableHead className="text-right">1 CDF → USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell>
                            {new Date(rate.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(rate.createdAt).toLocaleTimeString(
                              "fr-FR"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {rate.usdToCdf.toLocaleString()} CDF
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${rate.cdfToUsd.toFixed(6)}
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
