"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet, Partner } from "@/types";
import { BadgeList } from "@/components/BadgeList";
import MapPin from "@/components/MapPin";
import { createNotification } from "@/lib/notifications";

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
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    // Realtime pet doc — Lost Mode toggle updates land without reload.
    const unsubPet = onSnapshot(doc(db, "pets", id), (snap) => {
      if (snap.exists()) setPet({ id: snap.id, ...snap.data() } as Pet);
      setLoading(false);
    }, (err) => {
      console.error("Pet listener error:", err);
      setLoading(false);
    });

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

    // Other currently-lost pets for the manual compare tool
    (async () => {
      try {
        const q = query(collection(db, "pets"), where("status", "==", "lost"), limit(12));
        const lostSnap = await getDocs(q);
        setOtherLostPets(
          lostSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Pet)
            .filter((p) => p.id !== id)
        );
      } catch {}
    })();

    // Partners (shelters + vets) — public read for everyone
    const unsubPartners = onSnapshot(query(collection(db, "partners"), limit(50)), (snap) => {
      setPartners(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Partner)));
    }, () => {});

    return () => {
      unsubPet();
      unsubPartners();
    };
  }, [id]);

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

    // Notify the owner that their pet may have been found. Finders are often
    // anonymous, so this write is allowed by the Firestore rule for
    // `type == "pet_found"` notifications (see firebase/firestore.rules).
    if (pet) {
      await createNotification({
        userId: pet.ownerId,
        type: "pet_found",
        message: [
          `Your pet ${pet.name} was just reported found!`,
          finderMsg.trim() ? `Message: ${finderMsg.trim()}` : null,
          finderContact.trim() ? `Contact: ${finderContact.trim()}` : null,
          lat != null && lng != null
            ? `Location: https://www.google.com/maps?q=${lat},${lng}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        petId: id,
      });
    }

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

  // Filter partners by pet owner's city (best-effort) — fall back to first 3.
  const nearbyPartners = pet && partners.length > 0
    ? partners
        .filter((p) => !pet.lastSeenLocation || !p.city || p.city && pet.lastSeenLocation.toLowerCase().includes(p.city.toLowerCase()))
        .slice(0, 3)
    : [];
  const fallbackPartners = partners.slice(0, 3);

  return (
    <div className="max-w-md mx-auto">
      {isLost && (
        <div className="bg-alert-500 text-white text-center py-3 rounded-xl mb-4 font-semibold">
          🚨 {pet.name} is currently LOST — please read below
        </div>
      )}

      <div className="card text-center">
        <div
          className="w-full h-48 rounded-xl bg-gray-100 mx-auto overflow-hidden flex items-center justify-center text-6xl mb-3"
          style={{ aspectRatio: "1/1", maxHeight: "220px" }}
        >
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
          <MapPin
            lat={pet.lastSeenLat ?? null}
            lng={pet.lastSeenLng ?? null}
            fallbackQuery={pet.lastSeenLocation}
            label="Map of last-seen area"
          />
          {pet.rewardNote && (
            <p className="text-sm mb-1 mt-2">
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

      {/* Nearby shelters/vets — lightweight partnership directory */}
      {(nearbyPartners.length > 0 || fallbackPartners.length > 0) && (
        <div className="card mt-4">
          <h2 className="font-semibold mb-2 text-sm">
            🏥 Nearby shelters & vets
            <span className="text-xs text-gray-400 font-normal ml-1">(partners)</span>
          </h2>
          <div className="space-y-2">
            {(nearbyPartners.length > 0 ? nearbyPartners : fallbackPartners).map((p) => (
              <div key={p.id} className="text-sm border-b border-gray-50 pb-2 last:border-0">
                <p className="font-medium">
                  {p.name}
                  <span className="ml-2 text-xs text-gray-400 capitalize">({p.type})</span>
                </p>
                {p.address && <p className="text-xs text-gray-500">{p.address}</p>}
                {p.city && <p className="text-xs text-gray-400">{p.city}</p>}
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="text-xs text-brand-700 hover:underline">
                    📞 {p.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
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
