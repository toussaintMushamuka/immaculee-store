import { NextRequest, NextResponse } from "next/server";
import { getCustomerDebt } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const debt = await getCustomerDebt(params.id);
    return NextResponse.json(debt);
  } catch (error) {
    console.error("Error getting customer debt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la dette du client" },
      { status: 500 }
    );
  }
}




