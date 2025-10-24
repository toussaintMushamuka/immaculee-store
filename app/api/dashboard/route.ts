import { NextResponse } from "next/server";
import {
  getProducts,
  getSales,
  getCustomers,
  getPurchases,
} from "@/lib/database";

export async function GET() {
  try {
    const [products, sales, customers, purchases] = await Promise.all([
      getProducts(),
      getSales(),
      getCustomers(),
      getPurchases(),
    ]);

    const lowStockProducts = products.filter((p) => p.stock < 10);
    const recentSales = sales.slice(-5).reverse();

    return NextResponse.json({
      stats: {
        totalProducts: products.length,
        totalSales: sales.length,
        totalCustomers: customers.length,
        totalPurchases: purchases.length,
        lowStockProducts: lowStockProducts.length,
      },
      lowStockProducts,
      recentSales,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données du dashboard" },
      { status: 500 }
    );
  }
}




