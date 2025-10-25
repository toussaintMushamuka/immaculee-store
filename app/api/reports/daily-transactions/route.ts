import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get exchange rate for the day
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        date: {
          lte: endOfDay,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const usdToCdf = exchangeRate?.usdToCdf || 1;

    // Get purchases for the day
    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get sales for the day
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get payments for the day
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    const totalPurchasesUSD = purchases.reduce((sum, purchase) => {
      return (
        sum +
        (purchase.currency === Currency.USD
          ? purchase.total
          : purchase.total / usdToCdf)
      );
    }, 0);

    const totalSalesUSD = sales.reduce((sum, sale) => {
      return (
        sum +
        (sale.currency === Currency.USD ? sale.total : sale.total / usdToCdf)
      );
    }, 0);

    const totalPaymentsUSD = payments.reduce((sum, payment) => {
      return (
        sum +
        (payment.currency === Currency.USD
          ? payment.amount
          : payment.amount / usdToCdf)
      );
    }, 0);

    const totalExpensesUSD = expenses.reduce((sum, expense) => {
      return (
        sum +
        (expense.currency === Currency.USD
          ? expense.amount
          : expense.amount / usdToCdf)
      );
    }, 0);

    const netProfit = totalSalesUSD - totalPurchasesUSD - totalExpensesUSD;

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      exchangeRate: usdToCdf,
      summary: {
        totalPurchasesUSD,
        totalSalesUSD,
        totalPaymentsUSD,
        totalExpensesUSD,
        netProfit,
      },
      transactions: {
        purchases: purchases.map((purchase) => ({
          id: purchase.id,
          type: "Achat",
          product: purchase.product.name,
          quantity: purchase.quantity,
          unitPrice: purchase.unitPrice,
          total: purchase.total,
          currency: purchase.currency,
          supplier: purchase.supplier || "N/A",
          createdAt: purchase.createdAt,
        })),
        sales: sales.map((sale) => ({
          id: sale.id,
          type: "Vente",
          invoiceNumber: sale.invoiceNumber,
          customer: sale.customer?.name || "Client anonyme",
          total: sale.total,
          currency: sale.currency,
          isCredit: sale.isCredit,
          items: sale.items.map((item) => ({
            product: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            saleUnit: item.saleUnit,
          })),
          createdAt: sale.createdAt,
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          type: "Paiement",
          customer: payment.customer.name,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt,
        })),
        expenses: expenses.map((expense) => ({
          id: expense.id,
          type: "Dépense",
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          createdAt: expense.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error generating daily transactions report:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}






