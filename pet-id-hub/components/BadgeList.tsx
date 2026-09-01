"use client";

import { Badge } from "@/types";

const ALL_BADGES: Badge[] = [
  "Vaccinated",
  "Rescue",
  "Friendly",
  "Microchipped",
  "Trained",
  "Senior",
];

const BADGE_STYLES: Record<Badge, string> = {
  Vaccinated: "bg-brand-100 text-brand-700",
  Rescue: "bg-purple-100 text-purple-700",
  Friendly: "bg-yellow-100 text-yellow-700",
  Microchipped: "bg-blue-100 text-blue-700",
  Trained: "bg-indigo-100 text-indigo-700",
  Senior: "bg-gray-200 text-gray-700",
};

export function BadgeList({ badges }: { badges: string[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b} className={`badge-pill ${BADGE_STYLES[b as Badge] || "bg-gray-100 text-gray-600"}`}>
          {b}
        </span>
      ))}
    </div>
  );
}

export function BadgeEditor({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (badge: Badge) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_BADGES.map((b) => {
        const active = selected.includes(b);
        return (
          <button
            key={b}
            type="button"
            onClick={() => onToggle(b)}
            className={`badge-pill border transition-colors ${
              active
                ? BADGE_STYLES[b] + " border-transparent"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {b}
          </button>
        );
      })}
    </div>
  );
}
