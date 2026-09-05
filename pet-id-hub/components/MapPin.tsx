"use client";

import { useState } from "react";

/**
 * OpenStreetMap embed showing a single pin for a lost pet's last-seen
 * location. No API key required — we use the public export endpoint
 * at export.openstreetmap.org so this works on a free Vercel deploy.
 *
 * Falls back to a geocoded query when only a free-text location is given.
 */
export default function MapPin({
  lat,
  lng,
  label,
  fallbackQuery,
  height = 220,
}: {
  lat: number | null;
  lng: number | null;
  label?: string;
  fallbackQuery?: string | null;
  height?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  let bbox: string | null = null;
  let marker: string | null = null;

  if (typeof lat === "number" && typeof lng === "number") {
    const delta = 0.01;
    bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    marker = `${lat},${lng}`;
  } else if (fallbackQuery && fallbackQuery.trim()) {
    bbox = null;
    marker = null;
  } else {
    return null;
  }

  const params = new URLSearchParams();
  if (bbox) params.set("bbox", bbox);
  if (marker) {
    params.set("marker", marker);
    params.set("mlat", String(lat));
    params.set("mlon", String(lng));
  }
  if (fallbackQuery && !marker) params.set("q", fallbackQuery);
  params.set("layer", "mapnik");

  const src = `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  const link = marker
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(fallbackQuery ?? "")}`;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-brand-700 hover:underline"
      >
        {expanded ? "▾" : "▸"} {label ?? "Show on map"}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
          <iframe
            title="Last seen location map"
            src={src}
            style={{ width: "100%", height, border: 0 }}
            loading="lazy"
          />
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[10px] text-gray-400 text-center py-1 bg-gray-50 hover:text-brand-700"
          >
            View larger map ↗
          </a>
        </div>
      )}
    </div>
  );
}
