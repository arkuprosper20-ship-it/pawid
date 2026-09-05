"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet } from "@/types";
import MapPin from "@/components/MapPin";
import { BadgeList } from "@/components/BadgeList";

export default function LostPetsMapPage() {
  const [lostPets, setLostPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Realtime list of currently-lost pets. Public read is allowed by rules.
    const q = query(collection(db, "pets"), where("status", "==", "lost"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLostPets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pet)));
        setLoading(false);
      },
      (err) => {
        console.error("Lost pets listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div>
      <div className="text-center mb-2">
        <p className="eyebrow">
          <span /> Community map
        </p>
      </div>
      <h1 className="text-2xl font-bold mb-1">Lost Pets Map</h1>
      <p className="text-gray-500 text-sm mb-6">
        Pets currently reported lost, with their last-seen location. Expand a
        pin to see the area and help bring them home.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading lost pets...</p>
      ) : lostPets.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4" aria-hidden="true">
            🐾
          </div>
          <h2 className="text-xl font-semibold mb-2">No lost pets right now</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            When a pet is reported lost, they'll appear here for the whole
            community to see.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lostPets.map((pet) => {
            const hasCoords = pet.lastSeenLat != null && pet.lastSeenLng != null;
            const hasLocationText = Boolean(pet.lastSeenLocation);
            return (
              <div key={pet.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
                    {pet.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "🐾"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{pet.name}</h3>
                      <span className="badge-pill bg-alert-500 text-white">
                        LOST
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {pet.species}{" "}
                      {pet.breed ? `• ${pet.breed}` : ""}
                    </p>
                    <div className="mt-1">
                      <BadgeList badges={pet.badges || []} />
                    </div>
                  </div>
                </div>

                {pet.lastSeenLocation && (
                  <p className="text-sm mt-3">
                    <strong>Last seen:</strong> {pet.lastSeenLocation}
                  </p>
                )}
                {pet.rewardNote && (
                  <p className="text-sm mt-1">
                    <strong>Reward:</strong> {pet.rewardNote}
                  </p>
                )}

                {hasCoords || hasLocationText ? (
                  <MapPin
                    lat={pet.lastSeenLat ?? null}
                    lng={pet.lastSeenLng ?? null}
                    fallbackQuery={pet.lastSeenLocation}
                    label="Show last-seen area"
                    height={180}
                  />
                ) : (
                  <p className="text-xs text-gray-400 mt-3">
                    No location shared yet.
                  </p>
                )}

                <div className="mt-3">
                  <Link
                    href={`/pets/${pet.id}`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    View pet details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
