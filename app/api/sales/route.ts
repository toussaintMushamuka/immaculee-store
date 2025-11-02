import { NextRequest, NextResponse } from "next/server";
import { getSales, createSale } from "@/lib/database";

export async function GET() {
  try {
    const sales = await getSales();
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
    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la vente" },
      { status: 500 }
    );
  }
}
