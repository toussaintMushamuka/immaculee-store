import { NextRequest, NextResponse } from "next/server";
import {
  updateProduct,
  getProductStockInfo,
  deleteProduct,
} from "@/lib/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const product = await updateProduct(params.id, data);
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du produit" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stockInfo = await getProductStockInfo(params.id);
    return NextResponse.json(stockInfo);
  } catch (error) {
    console.error("Error getting product stock info:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des informations de stock" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteProduct(params.id);
    return NextResponse.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du produit" },
      { status: 500 }
    );
  }
}
