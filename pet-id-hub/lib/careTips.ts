// Rule-based daily care tip generator — no AI/API calls, fully free and offline.
// Picks a tip based on species/breed keywords + age, deterministic and instant.

interface TipInput {
  species: string;
  breed?: string | null;
  ageYears?: number | null;
}

const BREED_TIPS: Record<string, string[]> = {
  labrador: [
    "Labs are prone to weight gain — measure meals rather than free-feeding.",
    "Aim for 60+ minutes of active exercise today to prevent boredom chewing.",
  ],
  "golden retriever": [
    "Brush 2-3x this week to manage seasonal shedding.",
    "Watch for ear infections — goldens' floppy ears trap moisture.",
  ],
  poodle: [
    "Schedule a grooming trim if it's been 6+ weeks — poodle coats mat fast.",
    "Poodles are food-motivated; great day for a training refresher.",
  ],
  bulldog: [
    "Avoid exercise in heat today — bulldogs overheat easily due to their airway shape.",
    "Clean facial skin folds to prevent irritation.",
  ],
  chihuahua: [
    "Keep warm — small breeds lose body heat fast in cool weather.",
    "Dental checks matter — small breeds are prone to tooth crowding.",
  ],
  "german shepherd": [
    "High-energy breed — a structured walk plus a puzzle toy will help today.",
    "Watch hips/joints as they age; keep an eye on stiffness after rest.",
  ],
  siamese: [
    "Vocal and social — a few minutes of play will help avoid attention-seeking behavior.",
    "Keep an eye on dental health, common in Siamese cats.",
  ],
  "maine coon": [
    "Brush today — their long coat mats easily around the legs and belly.",
    "Provide a sturdy scratching post; they're a large, strong breed.",
  ],
  persian: [
    "Daily face cleaning helps prevent tear staining common in flat-faced cats.",
    "Brush thoroughly — Persian coats tangle quickly without daily care.",
  ],
};

const SPECIES_TIPS: Record<string, string[]> = {
  dog: [
    "A short training refresh (sit/stay) keeps skills sharp — 5 minutes is plenty.",
    "Check paws for cracks or debris after today's walk.",
    "Fresh water bowl check — refill and rinse to avoid bacteria buildup.",
  ],
  cat: [
    "Scoop the litter box today — cats are sensitive to box cleanliness.",
    "Rotate a toy they haven't seen in a week to keep enrichment novel.",
    "A few minutes of interactive play helps indoor cats burn energy.",
  ],
  bird: [
    "Rotate a perch or toy position — birds benefit from small environment changes.",
    "Check seed/pellet freshness; discard anything more than a day old in humid weather.",
  ],
  rabbit: [
    "Provide fresh hay — it should make up most of today's diet.",
    "Check teeth alignment; rabbits' teeth grow continuously.",
  ],
  other: [
    "Check habitat temperature and cleanliness today.",
    "Confirm food and water are fresh and accessible.",
  ],
};

const SENIOR_TIPS = [
  "As a senior pet, softer bedding can help with joint comfort.",
  "Consider a vet check-in if it's been over 6 months — senior pets benefit from more frequent visits.",
];

const YOUNG_TIPS = [
  "Young pets benefit from short, frequent training sessions rather than long ones.",
  "Socialization matters most right now — safe new experiences help long-term temperament.",
];

/**
 * Deterministic "tip of the day" — rotates based on the day of year so it
 * changes daily without needing any external service or AI call.
 */
export function getDailyCareTip({ species, breed, ageYears }: TipInput): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  const speciesKey = (species || "other").toLowerCase();
  const breedKey = (breed || "").toLowerCase().trim();

  const pool: string[] = [];

  const matchedBreed = Object.keys(BREED_TIPS).find((key) =>
    breedKey.includes(key)
  );
  if (matchedBreed) pool.push(...BREED_TIPS[matchedBreed]);

  pool.push(...(SPECIES_TIPS[speciesKey] || SPECIES_TIPS.other));

  if (ageYears != null) {
    if (ageYears >= 8) pool.push(...SENIOR_TIPS);
    else if (ageYears <= 1) pool.push(...YOUNG_TIPS);
  }

  if (pool.length === 0) return "Keep up with regular food, water, and affection today!";

  return pool[dayOfYear % pool.length];
}
