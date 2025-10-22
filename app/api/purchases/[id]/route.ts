import { NextRequest, NextResponse } from "next/server";
import { updatePurchase, deletePurchase } from "@/lib/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const purchase = await updatePurchase(params.id, data);
    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Error updating purchase:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'achat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deletePurchase(params.id);
    return NextResponse.json({ message: "Achat supprimé avec succès" });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'achat" },
      { status: 500 }
    );
  }
}
