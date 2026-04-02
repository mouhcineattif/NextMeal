"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Ingredient = {
  name: string;
  quantity: string;
};

type MealSuggestion = {
  meal_name: string;
  description: string;
  prep_time: string;
  ingredients: Ingredient[];
  steps: string[];
  lunchbox_tip: string;
};

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

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [ingredientsOnHand, setIngredientsOnHand] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealSuggestion | null>(null);

  const canSubmit = useMemo(() => !loading && apiKey.trim().length > 0, [apiKey, loading]);

  const buildUserPrompt = (isSurprise: boolean) => {
    const goal = isSurprise ? SURPRISE_PROMPT : prompt.trim() || "Give me a practical lunchbox idea.";

    return [
      goal,
      dietaryPreference ? `Dietary preference: ${dietaryPreference}` : null,
      prepTime ? `Available prep time: ${prepTime}` : null,
      ingredientsOnHand.trim() ? `Ingredients available: ${ingredientsOnHand.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const requestMeal = async (isSurprise = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          temperature: 0.8,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildUserPrompt(isSurprise),
            },
          ],
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Anthropic request failed (${response.status}): ${details}`);
      }

      const data = await response.json();
      const textBlock = data?.content?.find((item: { type: string }) => item.type === "text");
      const rawText = textBlock?.text;

      if (!rawText || typeof rawText !== "string") {
        throw new Error("No text content returned by Anthropic.");
      }

      const parsed = JSON.parse(rawText);
      const safeMeal = coerceMeal(parsed);

      if (!safeMeal) {
        throw new Error("Received invalid JSON format. Please try again.");
      }

      setMeal(safeMeal);
    } catch (err) {
      setMeal(null);
      setError(err instanceof Error ? err.message : "Unexpected error while generating meal.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestMeal(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <Badge className="w-fit" variant="secondary">
              LunchBox AI
            </Badge>
            <CardTitle className="text-3xl">What should I cook for lunch?</CardTitle>
            <CardDescription>
              Add your preferences, click generate, and get a complete lunchbox-friendly recipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Anthropic API key</label>
                <Input
                  placeholder="sk-ant-..."
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">What are you in the mood for?</label>
                <Input
                  placeholder="e.g., High protein but light"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dietary preference (optional)</label>
                <Input
                  placeholder="Vegetarian, no pork, gluten-free..."
                  value={dietaryPreference}
                  onChange={(event) => setDietaryPreference(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prep time (optional)</label>
                <Select value={prepTime} onChange={(event) => setPrepTime(event.target.value)}>
                  <option value="">No preference</option>
                  <option value="15 minutes">15 min</option>
                  <option value="30 minutes">30 min</option>
                  <option value="1 hour">1 hour</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ingredients you already have (optional)</label>
                <Textarea
                  placeholder="Rice, eggs, spinach, yogurt..."
                  value={ingredientsOnHand}
                  onChange={(event) => setIngredientsOnHand(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button disabled={!canSubmit} type="submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate meal
                </Button>
                <Button
                  disabled={!canSubmit}
                  type="button"
                  variant="outline"
                  onClick={() => requestMeal(true)}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Surprise me
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your meal suggestion</CardTitle>
            <CardDescription>
              Use <span className="font-medium">Generate another</span> to refresh with a new idea.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Claude is crafting your lunchbox...
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && !meal && (
              <p className="text-sm text-muted-foreground">
                No meal yet. Fill your preferences and generate your first lunchbox idea.
              </p>
            )}

            {meal && !loading && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold">{meal.meal_name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{meal.description}</p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Prep: {meal.prep_time}</Badge>
                </div>

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Ingredients
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {meal.ingredients.map((ingredient) => (
                      <li key={`${ingredient.name}-${ingredient.quantity}`}>
                        • {ingredient.name} — {ingredient.quantity}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Steps
                  </h3>
                  <ol className="list-inside list-decimal space-y-1 text-sm">
                    {meal.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>

                <section className="rounded-lg bg-secondary p-3 text-sm">
                  <span className="font-semibold">Lunchbox tip: </span>
                  {meal.lunchbox_tip}
                </section>

                <Button type="button" variant="secondary" onClick={() => requestMeal(true)}>
                  <RefreshCw className="h-4 w-4" />
                  Generate another
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
