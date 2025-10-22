import { NextRequest, NextResponse } from "next/server";
import { updateSale, deleteSale } from "@/lib/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const sale = await updateSale(params.id, data);
    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la vente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSale(params.id);
    return NextResponse.json({ message: "Vente supprimée avec succès" });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la vente" },
      { status: 500 }
    );
  }
}
