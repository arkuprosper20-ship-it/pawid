"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet, Badge } from "@/types";
import QRCodeBlock from "@/components/QRCodeBlock";
import LostModeToggle from "@/components/LostModeToggle";
import HealthLogPanel from "@/components/HealthLogPanel";
import { BadgeEditor } from "@/components/BadgeList";
import { getDailyCareTip } from "@/lib/careTips";

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const snap = await getDoc(doc(db, "pets", id));
    if (snap.exists()) setPet({ id: snap.id, ...snap.data() } as Pet);
    setLoading(false);
  }

  async function toggleBadge(badge: Badge) {
    if (!pet) return;
    const has = pet.badges?.includes(badge);
    await updateDoc(doc(db, "pets", pet.id), {
      badges: has ? arrayRemove(badge) : arrayUnion(badge),
    });
    setPet((p) =>
      p
        ? { ...p, badges: has ? p.badges.filter((b) => b !== badge) : [...p.badges, badge] }
        : p
    );
  }

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!pet) return <p className="text-gray-400">Pet not found.</p>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{pet.name}</h1>
              <p className="text-gray-500">
                {pet.species} {pet.breed ? `• ${pet.breed}` : ""}{" "}
                {pet.ageYears ? `• ${pet.ageYears} yrs` : ""}
              </p>
            </div>
          </div>

          <div className="bg-brand-50 text-brand-700 text-sm rounded-lg p-3 mt-4">
            💡 Today's tip: {getDailyCareTip({ species: pet.species, breed: pet.breed, ageYears: pet.ageYears })}
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-500 mb-1 block">Badges</label>
            <BadgeEditor selected={pet.badges || []} onToggle={toggleBadge} />
          </div>

          {pet.medicalNotes && (
            <p className="text-sm text-gray-600 mt-4">
              <strong>Medical notes:</strong> {pet.medicalNotes}
            </p>
          )}
          {pet.microchipId && (
            <p className="text-sm text-gray-600 mt-1">
              <strong>Microchip ID:</strong> {pet.microchipId}
            </p>
          )}
        </div>

        <LostModeToggle pet={pet} onUpdate={setPet} />

        <HealthLogPanel petId={pet.id} />
      </div>

      <div className="space-y-6">
        <QRCodeBlock petId={pet.id} petName={pet.name} />
        <a
          href={`/pets/${pet.id}`}
          target="_blank"
          className="btn-secondary block text-center text-sm"
        >
          View public profile ↗
        </a>
      </div>
    </div>
  );
}
