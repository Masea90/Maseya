// Single source of truth for the profile shape the scoring engine expects.
// Both ResultPage and HistoryPage must build it the same way, otherwise the
// personal score shown in a list can diverge from the product page.

export interface ActiveProfile {
  skin: string[];
  skin_type: string[];
  skin_conditions: string[];
  skin_sensitivities: string[];
  allergies: string[];
  diet: string[];
  nutrition_goals: string[];
  pregnancy_or_lactation: boolean;
}

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

/**
 * Normalizes a health_profiles row (or the local onboarding object) into the
 * shape the scoring engine consumes.
 */
export function buildActiveProfile(
  healthProfileRow: Record<string, unknown> | null | undefined,
  onboardingLocal?: Record<string, unknown> | null,
): ActiveProfile {
  const src = (healthProfileRow ?? onboardingLocal ?? {}) as Record<string, unknown>;
  return {
    skin: arr(src.skin),
    skin_type: arr(src.skin_type ?? src.skin),
    skin_conditions: arr(src.skin_conditions),
    skin_sensitivities: arr(src.skin_sensitivities ?? src.sensitivities),
    allergies: arr(src.allergies),
    diet: arr(src.diet),
    nutrition_goals: arr(src.nutrition_goals ?? src.goals),
    pregnancy_or_lactation: !!src.pregnancy_or_lactation,
  };
}
