"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { logActivity, addPetIdToProfile } from "@/lib/activityLog";

export default function NewPetPage() {
  const router = useRouter();
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const species = form.species === "Other" ? form.otherSpecies.trim() : form.species;
    if (!species) {
      setError("Please tell us what kind of pet you have.");
      setLoading(false);
      return;
    }

    if (photoFile && (!photoFile.type.startsWith("image/") || photoFile.size > 5 * 1024 * 1024)) {
      setError("Choose an image smaller than 5 MB.");
      setLoading(false);
      return;
    }

    try {
      const user = auth.currentUser || (await signInAnonymously(auth)).user;
      let photoUrl: string | null = null;
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split(".").pop();
          const storageRef = ref(storage, `pet-photos/${user.uid}/${Date.now()}.${fileExt}`);
          await uploadBytes(storageRef, photoFile);
          photoUrl = await getDownloadURL(storageRef);
        } catch (storageErr: any) {
          console.warn("Storage upload failed:", storageErr);
          if (storageErr?.code === "storage/retry-limit-exceeded" || storageErr?.message?.includes("retry-limit-exceeded")) {
            console.error("Firebase Storage is not enabled in Firebase Console. Please visit https://console.firebase.google.com/project/pawidhack/storage to click 'Get Started'.");
          }
        }
      }

      const docRef = await addDoc(collection(db, "pets"), {
        ownerId: user.uid,
        ownerEmail: user.email || null,
        name: form.name,
        species,
        breed: form.breed || null,
        ageYears: form.ageYears ? Number(form.ageYears) : null,
        medicalNotes: form.medicalNotes || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        microchipId: form.microchipId || null,
        petIdentifier: form.petIdentifier.trim() || null,
        photoUrl,
        status: "normal",
        lostSince: null,
        rewardNote: null,
        lastSeenLocation: null,
        badges: [],
        previousOwnerIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logActivity({
        userId: user.uid,
        action: "pet_created",
        petId: docRef.id,
        metadata: { petName: form.name, species },
      });

      await addPetIdToProfile(user.uid, docRef.id);

      const raw = window.localStorage.getItem("pawid_local_pet_ids");
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(docRef.id)) {
        list.push(docRef.id);
        window.localStorage.setItem("pawid_local_pet_ids", JSON.stringify(list));
      }

      router.push(`/dashboard/pets/${docRef.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong creating the pet.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add a pet</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          Create a pet ID instantly—an account is created automatically if you
          are not already signed in.
        </p>
        <input
          required
          aria-label="Pet name"
          placeholder="Pet name"
          className="input-field"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
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
          <input
            aria-label="Breed"
            placeholder="Breed"
            className="input-field"
            value={form.breed}
            onChange={(e) => update("breed", e.target.value)}
          />
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
        <input
          type="number"
          min="0"
          max="100"
          aria-label="Age in years"
          step="0.1"
          placeholder="Age (years)"
          className="input-field"
          value={form.ageYears}
          onChange={(e) => update("ageYears", e.target.value)}
        />
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Photo</label>
          <input
            type="file"
            accept="image/*"
            aria-label="Pet photo"
            onChange={handlePhotoChange}
            className="text-sm"
          />
          {photoPreview && (
            <div className="mt-2">
              <img
                src={photoPreview}
                alt="Selected pet photo preview"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}
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

        {error && <p role="alert" className="text-alert-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating..." : "Create pet profile"}
        </button>
      </form>
    </div>
  );
}
