"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet } from "@/types";
import { BadgeList } from "@/components/BadgeList";

export default function PublicPetPage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [finderMsg, setFinderMsg] = useState("");
  const [finderContact, setFinderContact] = useState("");
  const [sent, setSent] = useState(false);
  const [otherLostPets, setOtherLostPets] = useState<Pet[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "pets", id));
      if (snap.exists()) setPet({ id: snap.id, ...snap.data() } as Pet);

      // Log the scan (fire and forget) — anonymous writes allowed by security rules
      try {
        addDoc(collection(db, "qrScans"), {
          petId: id,
          scannedAt: serverTimestamp(),
          finderMessage: null,
          finderContact: null,
          finderLat: null,
          finderLng: null,
        });
      } catch {}

      // For the manual comparison tool: other currently-lost pets (MVP: all lost pets)
      try {
        const q = query(collection(db, "pets"), where("status", "==", "lost"), limit(12));
        const lostSnap = await getDocs(q);
        setOtherLostPets(
          lostSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Pet)
            .filter((p) => p.id !== id)
        );
      } catch {}
    } catch (err) {
      console.error("Failed to load pet details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendFinderMessage(e: React.FormEvent) {
    e.preventDefault();
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // location denied/unavailable — still allow sending message without it
    }

    await addDoc(collection(db, "qrScans"), {
      petId: id,
      scannedAt: serverTimestamp(),
      finderMessage: finderMsg,
      finderContact: finderContact,
      finderLat: lat,
      finderLng: lng,
    });
    setSent(true);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedPhoto(URL.createObjectURL(file));
    setShowCompare(true);
  }

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>;
  if (!pet) return <p className="text-center text-gray-400 mt-12">Pet not found.</p>;

  const isLost = pet.status === "lost";

  return (
    <div className="max-w-md mx-auto">
      {isLost && (
        <div className="bg-alert-500 text-white text-center py-3 rounded-xl mb-4 font-semibold">
          🚨 {pet.name} is currently LOST — please read below
        </div>
      )}

      <div className="card text-center">
        <div className="w-28 h-28 rounded-full bg-gray-100 mx-auto overflow-hidden flex items-center justify-center text-4xl mb-3">
          {pet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            "🐾"
          )}
        </div>
        <h1 className="text-2xl font-bold">{pet.name}</h1>
        <p className="text-gray-500 mb-2">
          {pet.species} {pet.breed ? `• ${pet.breed}` : ""}{" "}
          {pet.ageYears ? `• ${pet.ageYears} yrs` : ""}
        </p>
        <div className="flex justify-center">
          <BadgeList badges={pet.badges || []} />
        </div>
      </div>

      {isLost && (
        <div className="card mt-4 border-alert-500">
          <h2 className="font-semibold text-alert-600 mb-2">Found me? Please help!</h2>
          {pet.lastSeenLocation && (
            <p className="text-sm mb-1">
              <strong>Last seen:</strong> {pet.lastSeenLocation}
            </p>
          )}
          {pet.rewardNote && (
            <p className="text-sm mb-1">
              <strong>Reward:</strong> {pet.rewardNote}
            </p>
          )}
          {pet.emergencyContactName && (
            <p className="text-sm mb-1">
              <strong>Contact:</strong> {pet.emergencyContactName}{" "}
              {pet.emergencyContactPhone && `— ${pet.emergencyContactPhone}`}
            </p>
          )}

          {sent ? (
            <p className="text-brand-700 bg-brand-50 rounded-lg p-3 text-sm mt-3">
              Thanks! The owner has been notified.
            </p>
          ) : (
            <form onSubmit={sendFinderMessage} className="space-y-2 mt-3">
              <textarea
                required
                aria-label="Where did you find the pet?"
                placeholder="Where did you find them? Any details help."
                className="input-field text-sm"
                rows={2}
                value={finderMsg}
                onChange={(e) => setFinderMsg(e.target.value)}
              />
              <input
                aria-label="Your contact phone or email"
                placeholder="Your phone or email (optional)"
                className="input-field text-sm"
                value={finderContact}
                onChange={(e) => setFinderContact(e.target.value)}
              />
              <button type="submit" className="btn-alert w-full text-sm">
                📍 Send location & notify owner
              </button>
            </form>
          )}
        </div>
      )}

      {pet.medicalNotes && (
        <div className="card mt-4">
          <h2 className="font-semibold mb-1 text-sm">Medical notes</h2>
          <p className="text-sm text-gray-600">{pet.medicalNotes}</p>
        </div>
      )}

      {/* Manual (non-AI) stray-match helper: found a stray with no tag? */}
      <div className="card mt-4">
        <h2 className="font-semibold mb-1 text-sm">Found a stray with no tag?</h2>
        <p className="text-sm text-gray-500 mb-2">
          Upload a photo and compare it by eye against pets currently reported
          lost nearby.
        </p>
        <input
          type="file"
          accept="image/*"
          aria-label="Upload a photo of the stray pet"
          onChange={handlePhotoUpload}
          className="text-sm"
        />

        {showCompare && (
          <div className="mt-3">
            {uploadedPhoto && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Your photo:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedPhoto} alt="Uploaded stray" className="w-24 h-24 rounded-lg object-cover" />
              </div>
            )}
            <p className="text-xs text-gray-400 mb-2">
              Compare against {otherLostPets.length} currently lost pet
              {otherLostPets.length === 1 ? "" : "s"}:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {otherLostPets.map((lp) => (
                <a
                  key={lp.id}
                  href={`/pets/${lp.id}`}
                  className="text-center text-xs"
                >
                  <div className="w-full aspect-square rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center mb-1">
                    {lp.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lp.photoUrl} alt={lp.name} className="w-full h-full object-cover" />
                    ) : (
                      "🐾"
                    )}
                  </div>
                  {lp.name}
                </a>
              ))}
              {otherLostPets.length === 0 && (
                <p className="col-span-3 text-xs text-gray-400">
                  No pets currently reported lost.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 mt-6">Powered by PawID</p>
    </div>
  );
}
