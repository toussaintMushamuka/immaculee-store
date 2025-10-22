import { NextRequest, NextResponse } from "next/server";
import {
  getExchangeRates,
  getCurrentExchangeRate,
  createExchangeRate,
} from "@/lib/database";

export async function GET() {
  try {
    const [exchangeRates, currentRate] = await Promise.all([
      getExchangeRates(),
      getCurrentExchangeRate(),
    ]);
    return NextResponse.json({ exchangeRates, currentRate });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des taux de change" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const exchangeRate = await createExchangeRate(data);
    return NextResponse.json(exchangeRate);
  } catch (error) {
    console.error("Error creating exchange rate:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du taux de change" },
      { status: 500 }
    );
  }
}
