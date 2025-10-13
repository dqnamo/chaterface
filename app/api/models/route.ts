import { NextResponse } from "next/server";
import { fetchModelCatalog, fetchProviderCatalog } from "@/constants/models";

export async function GET() {
  try {
    const [models, providers] = await Promise.all([
      fetchModelCatalog(),
      fetchProviderCatalog(),
    ]);

    return NextResponse.json({ models, providers });
  } catch (error) {
    console.error("Failed to load OpenRouter models", error);
    return NextResponse.json(
      { error: "Failed to load models from OpenRouter" },
      { status: 500 },
    );
  }
}
