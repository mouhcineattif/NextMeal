import { NextResponse } from "next/server";

import { generateMealSuggestion } from "@/lib/ai/meal-generator";
import type { MealRequest } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MealRequest;
    const meal = await generateMealSuggestion(body);

    return NextResponse.json({ meal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while generating meal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
