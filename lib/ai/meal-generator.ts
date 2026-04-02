import OpenAI from "openai";

import type { MealRequest, MealSuggestion } from "@/lib/ai/types";

const SYSTEM_PROMPT = `You are LunchBox AI, an assistant that creates practical, healthy, office-friendly meal ideas.
Return ONLY valid JSON matching exactly this schema:
{
  "meal_name": "string",
  "description": "string",
  "prep_time": "string",
  "ingredients": [{ "name": "string", "quantity": "string" }],
  "steps": ["string"],
  "lunchbox_tip": "string"
}
Rules:
- Keep meals realistic and lunchbox-friendly.
- Keep steps concise but actionable.
- Include quantities for all ingredients.
- Never return markdown or extra text.`;

const SURPRISE_PROMPT = "Surprise me with a balanced lunchbox meal I can prep for work.";

function coerceMeal(data: unknown): MealSuggestion | null {
  if (!data || typeof data !== "object") return null;

  const candidate = data as MealSuggestion;
  if (
    typeof candidate.meal_name !== "string" ||
    typeof candidate.description !== "string" ||
    typeof candidate.prep_time !== "string" ||
    typeof candidate.lunchbox_tip !== "string" ||
    !Array.isArray(candidate.ingredients) ||
    !Array.isArray(candidate.steps)
  ) {
    return null;
  }

  return {
    meal_name: candidate.meal_name,
    description: candidate.description,
    prep_time: candidate.prep_time,
    lunchbox_tip: candidate.lunchbox_tip,
    ingredients: candidate.ingredients
      .filter((item) => typeof item?.name === "string" && typeof item?.quantity === "string")
      .map((item) => ({ name: item.name, quantity: item.quantity })),
    steps: candidate.steps.filter((step) => typeof step === "string"),
  };
}

function buildUserPrompt(request: MealRequest): string {
  const goal = request.isSurprise
    ? SURPRISE_PROMPT
    : request.prompt?.trim() || "Give me a practical lunchbox idea.";

  return [
    goal,
    request.dietaryPreference ? `Dietary preference: ${request.dietaryPreference}` : null,
    request.prepTime ? `Available prep time: ${request.prepTime}` : null,
    request.ingredientsOnHand?.trim()
      ? `Ingredients available: ${request.ingredientsOnHand.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateMealSuggestion(request: MealRequest): Promise<MealSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_output_tokens: 1000,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildUserPrompt(request) }],
      },
    ],
  });

  const rawText = response.output_text;

  if (!rawText || typeof rawText !== "string") {
    throw new Error("No text content returned by OpenAI.");
  }

  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleanedText);
  const safeMeal = coerceMeal(parsed);

  if (!safeMeal) {
    throw new Error("Received invalid JSON format. Please try again.");
  }

  return safeMeal;
}
