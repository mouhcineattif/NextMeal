export type Ingredient = {
  name: string;
  quantity: string;
};

export type MealSuggestion = {
  meal_name: string;
  description: string;
  prep_time: string;
  ingredients: Ingredient[];
  steps: string[];
  lunchbox_tip: string;
};

export type MealRequest = {
  prompt?: string;
  dietaryPreference?: string;
  prepTime?: string;
  ingredientsOnHand?: string;
  isSurprise?: boolean;
};
