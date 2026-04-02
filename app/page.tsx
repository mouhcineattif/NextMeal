"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MealSuggestion } from "@/lib/ai/types";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [ingredientsOnHand, setIngredientsOnHand] = useState("");
  const [language, setLanguage] = useState<"english" | "arabic" | "darija" | "french">("english");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealSuggestion | null>(null);

  const canSubmit = useMemo(() => !loading, [loading]);

  const requestMeal = async (isSurprise = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isSurprise,
          prompt,
          dietaryPreference,
          prepTime,
          ingredientsOnHand,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "OpenAI request failed.");
      }

      setMeal(data.meal as MealSuggestion);
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
                <label className="text-sm font-medium">Response language</label>
                <Select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
                  <option value="english">English</option>
                  <option value="arabic">Arabic (فصحى)</option>
                  <option value="darija">Darija (Moroccan Arabic)</option>
                  <option value="french">French</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ingredients you already have (optional)</label>
                <Textarea
                  placeholder="Rice, eggs, spinach, yogurt... or Darija ingredient names"
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
                OpenAI is crafting your lunchbox...
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
