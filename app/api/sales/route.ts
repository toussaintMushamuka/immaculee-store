import { NextRequest, NextResponse } from "next/server";
import { getSales, createSale } from "@/lib/database";
import { cache, CACHE_KEYS } from "@/lib/cache";

export async function GET() {
  try {
    // Check cache first
    const cachedSales = cache.get(CACHE_KEYS.SALES);
    if (cachedSales) {
      return NextResponse.json(cachedSales);
    }

    // Fetch from database with limit for performance
    const sales = await getSales(50); // Limit to 50 most recent sales

    // Cache for 2 minutes (sales change more frequently)
    cache.set(CACHE_KEYS.SALES, sales, 2 * 60 * 1000);

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des ventes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const sale = await createSale(data);

    // Clear sales cache when new sale is created
    cache.delete(CACHE_KEYS.SALES);
    cache.delete(CACHE_KEYS.DASHBOARD); // Also clear dashboard cache

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la vente" },
      { status: 500 }
    );
  }
}
