"use client";

import { useState } from "react";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet } from "@/types";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/notifications";

export default function LostModeToggle({
  pet,
  onUpdate,
}: {
  pet: Pet;
  onUpdate: (pet: Pet) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rewardNote, setRewardNote] = useState(pet.rewardNote ?? "");
  const [lastSeen, setLastSeen] = useState(pet.lastSeenLocation ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    pet.lastSeenLat != null && pet.lastSeenLng != null
      ? { lat: pet.lastSeenLat, lng: pet.lastSeenLng }
      : null
  );
  const [locating, setLocating] = useState(false);
  const isLost = pet.status === "lost";

  function captureLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  async function toggleLost() {
    setLoading(true);
    const nextStatus: Pet["status"] = isLost ? "normal" : "lost";

    const updates: Record<string, unknown> = {
      status: nextStatus,
      lostSince: nextStatus === "lost" ? new Date().toISOString() : null,
      rewardNote: nextStatus === "lost" ? rewardNote : pet.rewardNote,
      lastSeenLocation: nextStatus === "lost" ? lastSeen : pet.lastSeenLocation,
      lastSeenLat: nextStatus === "lost" ? coords?.lat ?? null : pet.lastSeenLat,
      lastSeenLng: nextStatus === "lost" ? coords?.lng ?? null : pet.lastSeenLng,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "pets", pet.id), updates);
    onUpdate({
      ...pet,
      status: nextStatus,
      lostSince: updates.lostSince as string | null,
      rewardNote: updates.rewardNote as string | null,
      lastSeenLocation: updates.lastSeenLocation as string | null,
      lastSeenLat: updates.lastSeenLat as number | null,
      lastSeenLng: updates.lastSeenLng as number | null,
    });

    await logActivity({
      userId: pet.ownerId,
      action: nextStatus === "lost" ? "pet_lost_mode_enabled" : "pet_lost_mode_disabled",
      petId: pet.id,
      metadata: { petName: pet.name },
    });

    if (nextStatus === "lost") {
      await addDoc(collection(db, "broadcastAlerts"), {
        petId: pet.id,
        message: `${pet.name} was reported lost${lastSeen ? ` near ${lastSeen}` : ""}. Please keep an eye out!`,
        triggeredBy: null,
        isManual: false,
        createdAt: serverTimestamp(),
      });
      await createNotification({
        userId: pet.ownerId,
        type: "lost_mode",
        message: `🚨 Lost mode activated for ${pet.name}. A community alert has been broadcasted.`,
        petId: pet.id,
      });
    } else {
      await createNotification({
        userId: pet.ownerId,
        type: "pet_found",
        message: `Great news! ${pet.name} has been marked as found.`,
        petId: pet.id,
      });
    }

    setLoading(false);
  }

  return (
    <div className={`card ${isLost ? "border-alert-500 bg-red-50" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">
          {isLost ? "🚨 Currently marked LOST" : "Lost Mode"}
        </h3>
        <button
          onClick={toggleLost}
          disabled={loading}
          className={isLost ? "btn-secondary text-sm" : "btn-alert text-sm"}
        >
          {loading ? "Updating..." : isLost ? "Mark as found" : "Report lost"}
        </button>
      </div>

      {!isLost && (
        <div className="space-y-2">
          <input
            placeholder="Last seen location (e.g. 'Oak Park, Chicago')"
            className="input-field text-sm"
            value={lastSeen}
            onChange={(e) => setLastSeen(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="text-xs text-brand-700 hover:underline disabled:text-gray-400"
            >
              {locating
                ? "Locating..."
                : coords
                ? "📍 Use current location"
                : "📍 Pin current location on map"}
            </button>
            {coords && (
              <span className="text-xs text-gray-400">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
          </div>
          <input
            placeholder="Reward note (optional)"
            className="input-field text-sm"
            value={rewardNote}
            onChange={(e) => setRewardNote(e.target.value)}
          />
        </div>
      )}

      {isLost && (
        <p className="text-sm text-gray-600">
          The public QR page now shows an urgent alert with your emergency
          contact, reward note, and map pin. A community alert has been
          broadcast.
        </p>
      )}
    </div>
  );
}
