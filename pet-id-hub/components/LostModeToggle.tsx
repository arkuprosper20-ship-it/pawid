"use client";

import { useState } from "react";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet } from "@/types";

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
  const isLost = pet.status === "lost";

  async function toggleLost() {
    setLoading(true);
    const nextStatus = isLost ? "normal" : "lost";

    const updates = {
      status: nextStatus,
      lostSince: nextStatus === "lost" ? new Date().toISOString() : null,
      rewardNote: nextStatus === "lost" ? rewardNote : pet.rewardNote,
      lastSeenLocation: nextStatus === "lost" ? lastSeen : pet.lastSeenLocation,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "pets", pet.id), updates);
    onUpdate({ ...pet, ...updates, lostSince: updates.lostSince } as Pet);

    // Fire a community broadcast alert when a pet goes lost
    if (nextStatus === "lost") {
      await addDoc(collection(db, "broadcastAlerts"), {
        petId: pet.id,
        message: `${pet.name} was reported lost${lastSeen ? ` near ${lastSeen}` : ""}. Please keep an eye out!`,
        triggeredBy: null,
        isManual: false,
        createdAt: serverTimestamp(),
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
            placeholder="Last seen location (optional)"
            className="input-field text-sm"
            value={lastSeen}
            onChange={(e) => setLastSeen(e.target.value)}
          />
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
          contact and reward note. A community alert has been broadcast.
        </p>
      )}
    </div>
  );
}
