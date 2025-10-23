import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/database";

export async function POST() {
  try {
    // Vérifier si un utilisateur existe déjà
    const existingUser = await getUserByEmail("admin@stockmanager.com");

    if (existingUser) {
      return NextResponse.json({
        message: "Utilisateur admin déjà créé",
        user: { email: existingUser.email },
      });
    }

    // Créer l'utilisateur admin par défaut
    const adminUser = await createUser({
      email: "admin@stockmanager.com",
      password: "admin123",
    });

    return NextResponse.json({
      message: "Utilisateur admin créé avec succès",
      user: { email: adminUser.email },
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation" },
      { status: 500 }
    );
  }
}

