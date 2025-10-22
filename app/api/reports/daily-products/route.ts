import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // If no exchange rate for the specific day, get the most recent one
    const fallbackExchangeRate =
      exchangeRate ||
      (await prisma.exchangeRate.findFirst({
        orderBy: {
          date: "desc",
        },
      }));

    const usdToCdf = fallbackExchangeRate?.usdToCdf || 1;

    // Get all products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
      },
    });

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
    });

    // Process data by product
    const productReports = products.map((product) => {
      // Calculate purchases for this product
      const productPurchases = purchases.filter(
        (purchase) => purchase.productId === product.id
      );

      const totalPurchasedQuantity = productPurchases.reduce(
        (sum, purchase) => sum + purchase.quantity,
        0
      );

      const totalPurchaseCostUSD = productPurchases.reduce((sum, purchase) => {
        const costInUSD =
          purchase.currency === "USD"
            ? purchase.total
            : purchase.total / usdToCdf;
        return sum + costInUSD;
      }, 0);

      // Calculate sales for this product
      const productSales = sales.flatMap((sale) =>
        sale.items.filter((item) => item.productId === product.id)
      );

      const totalSoldQuantity = productSales.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const totalSalesRevenueUSD = productSales.reduce((sum, item) => {
        const revenueInUSD =
          item.sale.currency === "USD" ? item.total : item.total / usdToCdf;
        return sum + revenueInUSD;
      }, 0);

      const profit = totalSalesRevenueUSD - totalPurchaseCostUSD;

      return {
        productId: product.id,
        productName: product.name,
        date: targetDate.toISOString().split("T")[0],
        purchasedQuantity: totalPurchasedQuantity,
        purchaseCostUSD: totalPurchaseCostUSD,
        soldQuantity: totalSoldQuantity,
        salesRevenueUSD: totalSalesRevenueUSD,
        profit: profit,
      };
    });

    // Calculate total profit
    const totalProfit = productReports.reduce(
      (sum, report) => sum + report.profit,
      0
    );

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      exchangeRate: usdToCdf,
      products: productReports,
      totalProfit,
    });
  } catch (error) {
    console.error("Error generating daily product report:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}
