"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pet, Badge } from "@/types";
import QRCodeBlock from "@/components/QRCodeBlock";
import LostModeToggle from "@/components/LostModeToggle";
import HealthLogPanel from "@/components/HealthLogPanel";
import { BadgeEditor } from "@/components/BadgeList";
import { getDailyCareTip } from "@/lib/careTips";
import { logActivity } from "@/lib/activityLog";

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    species: "Dog",
    breed: "",
    ageYears: "",
    medicalNotes: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    microchipId: "",
    petIdentifier: "",
    otherSpecies: "",
  });

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "pets", id));
      if (snap.exists()) {
        const data = snap.data() as Pet;
        setPet({ id: snap.id, ...data });
        setForm({
          name: data.name || "",
          species: data.species || "Dog",
          breed: data.breed || "",
          ageYears: data.ageYears ? String(data.ageYears) : "",
          medicalNotes: data.medicalNotes || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactPhone: data.emergencyContactPhone || "",
          microchipId: data.microchipId || "",
          petIdentifier: data.petIdentifier || "",
          otherSpecies: data.species && !["Dog", "Cat", "Bird", "Rabbit"].includes(data.species) ? data.species : "",
        });
      }
    } catch (err) {
      console.error("Failed to load pet:", err);
    } finally {
      setLoading(false);
    }
  }

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
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

    await logActivity({
      userId: pet.ownerId,
      action: "badge_toggled",
      petId: pet.id,
      metadata: { badge, added: !has },
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!pet) return;
    setSaving(true);
    setError(null);
    try {
      const species = form.species === "Other" ? form.otherSpecies.trim() : form.species;
      if (!species) {
        setError("Please tell us what kind of pet you have.");
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, "pets", pet.id), {
        name: form.name,
        species,
        breed: form.breed || null,
        ageYears: form.ageYears ? Number(form.ageYears) : null,
        medicalNotes: form.medicalNotes || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        microchipId: form.microchipId || null,
        petIdentifier: form.petIdentifier.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setPet((p) => {
        if (!p) return p;
        const species = form.species === "Other" ? form.otherSpecies.trim() : form.species;
        return {
          ...p,
          name: form.name,
          species: species || p.species,
          breed: form.breed || null,
          ageYears: form.ageYears ? Number(form.ageYears) : null,
          medicalNotes: form.medicalNotes || null,
          emergencyContactName: form.emergencyContactName || null,
          emergencyContactPhone: form.emergencyContactPhone || null,
          microchipId: form.microchipId || null,
          petIdentifier: form.petIdentifier.trim() || null,
        };
      });
      setEditing(false);
      await logActivity({
        userId: pet.ownerId,
        action: "pet_updated",
        petId: pet.id,
        metadata: { petName: form.name },
      });
    } catch (err: any) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePet() {
    if (!pet) return;
    const ok = window.confirm(`Delete ${pet.name}? This cannot be undone.`);
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "pets", pet.id));
      await logActivity({
        userId: pet.ownerId,
        action: "pet_deleted",
        petId: pet.id,
        metadata: { petName: pet.name },
      });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to delete pet.");
      setDeleting(false);
    }
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
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={deletePet}
                    disabled={deleting}
                    className="text-xs text-alert-500 hover:underline border border-alert-200 rounded-lg px-3 py-1.5"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-alert-500 text-sm mt-3">{error}</p>}

          {editing ? (
            <form onSubmit={saveEdit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  aria-label="Pet name"
                  placeholder="Pet name"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <select
                  aria-label="Species"
                  className="input-field"
                  value={form.species}
                  onChange={(e) => update("species", e.target.value)}
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Bird</option>
                  <option>Rabbit</option>
                  <option>Other</option>
                </select>
              </div>
              {form.species === "Other" && (
                <input
                  required
                  aria-label="Pet species"
                  placeholder="What kind of pet?"
                  className="input-field"
                  value={form.otherSpecies}
                  onChange={(e) => update("otherSpecies", e.target.value)}
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Breed"
                  placeholder="Breed"
                  className="input-field"
                  value={form.breed}
                  onChange={(e) => update("breed", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  aria-label="Age in years"
                  placeholder="Age (years)"
                  className="input-field"
                  value={form.ageYears}
                  onChange={(e) => update("ageYears", e.target.value)}
                />
              </div>
              <textarea
                aria-label="Medical notes"
                placeholder="Medical notes (allergies, conditions, etc.)"
                className="input-field"
                rows={3}
                value={form.medicalNotes}
                onChange={(e) => update("medicalNotes", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Emergency contact name"
                  placeholder="Emergency contact name"
                  className="input-field"
                  value={form.emergencyContactName}
                  onChange={(e) => update("emergencyContactName", e.target.value)}
                />
                <input
                  type="tel"
                  aria-label="Emergency contact phone"
                  placeholder="Emergency contact phone"
                  className="input-field"
                  value={form.emergencyContactPhone}
                  onChange={(e) => update("emergencyContactPhone", e.target.value)}
                />
              </div>
              <input
                aria-label="Microchip ID"
                placeholder="Microchip ID (optional)"
                className="input-field"
                value={form.microchipId}
                onChange={(e) => update("microchipId", e.target.value)}
              />
              <input
                aria-label="Pet ID or tag number"
                placeholder="Pet ID / tag number (optional)"
                className="input-field"
                value={form.petIdentifier}
                onChange={(e) => update("petIdentifier", e.target.value)}
              />
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          ) : (
            <>
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
              {pet.petIdentifier && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Pet ID / tag number:</strong> {pet.petIdentifier}
                </p>
              )}
            </>
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
          rel="noopener noreferrer"
          className="btn-secondary block text-center text-sm"
        >
          View public profile ↗
        </a>
      </div>
    </div>
  );
}
