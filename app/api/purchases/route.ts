import { NextRequest, NextResponse } from "next/server";
import { getPurchases, createPurchase } from "@/lib/database";

export async function GET() {
  try {
    const purchases = await getPurchases();
    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des achats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const purchase = await createPurchase(data);
    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Error creating purchase:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'achat" },
      { status: 500 }
    );
  }
}
