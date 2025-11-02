import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/database";
import { cache, CACHE_KEYS } from "@/lib/cache";

export async function GET() {
  try {
    // Check cache first
    const cachedProducts = cache.get(CACHE_KEYS.PRODUCTS);
    if (cachedProducts) {
      return NextResponse.json(cachedProducts);
    }

    // Fetch from database
    const products = await getProducts();

    // Cache for 5 minutes
    //cache.set(CACHE_KEYS.PRODUCTS, products, 5 * 60 * 1000);

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const product = await createProduct(data);

    // Clear products cache when new product is created
    cache.delete(CACHE_KEYS.PRODUCTS);

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du produit" },
      { status: 500 }
    );
  }
}
