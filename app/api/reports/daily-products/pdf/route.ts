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
        productName: product.name,
        purchasedQuantity: totalPurchasedQuantity,
        purchaseCostUSD: totalPurchaseCostUSD,
        soldQuantity: totalSoldQuantity,
        salesRevenueUSD: totalSalesRevenueUSD,
        profit: profit,
      };
    });

    const totalProfit = productReports.reduce(
      (sum, report) => sum + report.profit,
      0
    );

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Journalier - ${targetDate.toLocaleDateString(
          "fr-FR"
        )}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin-bottom: 10px; }
          .header p { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total { font-weight: bold; background-color: #e8f5e8; }
          .profit { color: #2e7d32; }
          .loss { color: #d32f2f; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport Journalier par Produit</h1>
          <p>Date: ${targetDate.toLocaleDateString("fr-FR")}</p>
          <p>Taux de change: 1 USD = ${usdToCdf.toLocaleString()} CDF</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité Achetée</th>
              <th>Coût Total (USD)</th>
              <th>Quantité Vendue</th>
              <th>Revenus (USD)</th>
              <th>Bénéfice (USD)</th>
            </tr>
          </thead>
          <tbody>
            ${productReports
              .map(
                (report) => `
              <tr>
                <td>${report.productName}</td>
                <td>${report.purchasedQuantity}</td>
                <td>$${report.purchaseCostUSD.toFixed(2)}</td>
                <td>${report.soldQuantity}</td>
                <td>$${report.salesRevenueUSD.toFixed(2)}</td>
                <td class="${report.profit >= 0 ? "profit" : "loss"}">
                  $${report.profit.toFixed(2)}
                </td>
              </tr>
            `
              )
              .join("")}
            <tr class="total">
              <td colspan="5"><strong>BÉNÉFICE TOTAL</strong></td>
              <td class="${totalProfit >= 0 ? "profit" : "loss"}">
                <strong>$${totalProfit.toFixed(2)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="rapport-journalier-${
          targetDate.toISOString().split("T")[0]
        }.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport PDF" },
      { status: 500 }
    );
  }
}
