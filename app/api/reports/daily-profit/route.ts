import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Récupérer les ventes de la journée (seulement les ventes comptant)
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isCredit: false, // Seulement les ventes comptant pour le bénéfice réel
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Récupérer les achats de la journée pour calculer les coûts
    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
      },
    });

    // Récupérer les dépenses de la journée
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Récupérer les dettes (ventes à crédit non payées)
    const creditSales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isCredit: true,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Récupérer les paiements de la journée pour calculer les dettes payées
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Récupérer tous les produits pour identifier ceux en rupture de stock
    const allProducts = await prisma.product.findMany();

    // Récupérer le taux de change le plus récent
    const latestExchangeRate = await prisma.exchangeRate.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Utiliser le taux de change de la base de données ou un taux par défaut
    const exchangeRate = latestExchangeRate?.usdToCdf || 2500; // 1 USD = 2500 CDF par défaut

    // Fonction pour convertir les montants en USD
    const convertToUSD = (amount: number, currency: string) => {
      if (currency === "USD") {
        return amount;
      } else {
        // Convertir CDF en USD
        return amount / exchangeRate;
      }
    };

    // Calculer les revenus des ventes (tout en USD)
    let totalSalesInUSD = 0;
    let totalSalesUSD = 0;
    let totalSalesCDF = 0;

    sales.forEach((sale) => {
      const saleAmountUSD = convertToUSD(sale.total, sale.currency);
      totalSalesInUSD += saleAmountUSD;

      if (sale.currency === "USD") {
        totalSalesUSD += sale.total;
      } else {
        totalSalesCDF += sale.total;
      }
    });

    // Calculer les coûts d'achat (tout en USD)
    let totalCostInUSD = 0;
    let totalCostUSD = 0;
    let totalCostCDF = 0;

    purchases.forEach((purchase) => {
      const costAmountUSD = convertToUSD(purchase.total, purchase.currency);
      totalCostInUSD += costAmountUSD;

      if (purchase.currency === "USD") {
        totalCostUSD += purchase.total;
      } else {
        totalCostCDF += purchase.total;
      }
    });

    // Calculer les dépenses (tout en USD)
    let totalExpensesInUSD = 0;
    let totalExpensesUSD = 0;
    let totalExpensesCDF = 0;

    expenses.forEach((expense) => {
      const expenseAmountUSD = convertToUSD(expense.amount, expense.currency);
      totalExpensesInUSD += expenseAmountUSD;

      if (expense.currency === "USD") {
        totalExpensesUSD += expense.amount;
      } else {
        totalExpensesCDF += expense.amount;
      }
    });

    // Calculer les dettes (ventes à crédit) en USD
    let totalDebtsInUSD = 0;
    let totalDebtsUSD = 0;
    let totalDebtsCDF = 0;

    creditSales.forEach((sale) => {
      const debtAmountUSD = convertToUSD(sale.total, sale.currency);
      totalDebtsInUSD += debtAmountUSD;

      if (sale.currency === "USD") {
        totalDebtsUSD += sale.total;
      } else {
        totalDebtsCDF += sale.total;
      }
    });

    // Calculer les paiements reçus en USD
    let totalPaymentsInUSD = 0;
    let totalPaymentsUSD = 0;
    let totalPaymentsCDF = 0;

    payments.forEach((payment) => {
      const paymentAmountUSD = convertToUSD(payment.amount, payment.currency);
      totalPaymentsInUSD += paymentAmountUSD;

      if (payment.currency === "USD") {
        totalPaymentsUSD += payment.amount;
      } else {
        totalPaymentsCDF += payment.amount;
      }
    });

    // Calculer le bénéfice brut et net (tout en USD)
    const grossProfitInUSD = totalSalesInUSD - totalCostInUSD;
    const netProfitInUSD =
      grossProfitInUSD -
      totalExpensesInUSD -
      totalDebtsInUSD +
      totalPaymentsInUSD;

    // Calculer aussi les bénéfices par devise pour l'affichage
    const grossProfitUSD = totalSalesUSD - totalCostUSD;
    const grossProfitCDF = totalSalesCDF - totalCostCDF;
    const netProfitUSD =
      grossProfitUSD - totalExpensesUSD - totalDebtsUSD + totalPaymentsUSD;
    const netProfitCDF =
      grossProfitCDF - totalExpensesCDF - totalDebtsCDF + totalPaymentsCDF;

    // Calculer le bénéfice par produit vendu (tout en USD)
    const productProfits = [];
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = item.product;
        const salePrice = item.unitPrice;
        const quantity = item.quantity;

        // Convertir le prix de vente en USD
        const salePriceUSD = convertToUSD(salePrice, sale.currency);

        // Calculer le coût d'achat unitaire en USD
        let unitCostUSD = 0;
        if (item.saleUnit === "purchase") {
          // Vente en gros - utiliser le prix d'achat direct
          const recentPurchase = purchases
            .filter((p) => p.productId === product.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

          if (recentPurchase) {
            unitCostUSD = convertToUSD(
              recentPurchase.unitPrice,
              recentPurchase.currency
            );
          }
        } else {
          // Vente au détail - calculer le coût unitaire basé sur le facteur de conversion
          const recentPurchase = purchases
            .filter((p) => p.productId === product.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

          if (recentPurchase) {
            const unitCostInOriginalCurrency =
              recentPurchase.unitPrice / product.conversionFactor;
            unitCostUSD = convertToUSD(
              unitCostInOriginalCurrency,
              recentPurchase.currency
            );
          }
        }

        const profitUSD = (salePriceUSD - unitCostUSD) * quantity;

        productProfits.push({
          productName: product.name,
          quantity: quantity,
          saleUnit: item.saleUnit,
          salePrice: salePrice,
          salePriceUSD: salePriceUSD,
          unitCost: unitCostUSD,
          profit: profitUSD,
          currency: sale.currency,
        });
      });
    });

    // Identifier les produits en rupture de stock
    const outOfStockProducts = allProducts.filter(
      (product) => product.stock === 0
    );
    const lowStockProducts = allProducts.filter(
      (product) => product.stock > 0 && product.stock <= 5
    );

    return NextResponse.json({
      date: date,
      summary: {
        totalSalesUSD,
        totalSalesCDF,
        totalSalesInUSD,
        totalCostUSD,
        totalCostCDF,
        totalCostInUSD,
        totalExpensesUSD,
        totalExpensesCDF,
        totalExpensesInUSD,
        totalDebtsUSD,
        totalDebtsCDF,
        totalDebtsInUSD,
        totalPaymentsUSD,
        totalPaymentsCDF,
        totalPaymentsInUSD,
        grossProfitUSD,
        grossProfitCDF,
        grossProfitInUSD,
        netProfitUSD,
        netProfitCDF,
        netProfitInUSD,
        exchangeRate,
      },
      salesCount: sales.length,
      purchasesCount: purchases.length,
      expensesCount: expenses.length,
      creditSalesCount: creditSales.length,
      paymentsCount: payments.length,
      productProfits,
      outOfStockProducts,
      lowStockProducts,
      sales,
      purchases,
      expenses,
      creditSales,
      payments,
    });
  } catch (error) {
    console.error("Error calculating daily profit:", error);
    return NextResponse.json(
      { error: "Failed to calculate daily profit" },
      { status: 500 }
    );
  }
}
