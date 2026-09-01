"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

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
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const storageRef = ref(storage, `pet-photos/${user.uid}/${Date.now()}.${fileExt}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, "pets"), {
        ownerId: user.uid,
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        ageYears: form.ageYears ? Number(form.ageYears) : null,
        medicalNotes: form.medicalNotes || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        microchipId: form.microchipId || null,
        photoUrl,
        status: "normal",
        lostSince: null,
        rewardNote: null,
        lastSeenLocation: null,
        badges: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
        <input
          required
          placeholder="Pet name"
          className="input-field"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
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
            placeholder="Breed"
            className="input-field"
            value={form.breed}
            onChange={(e) => update("breed", e.target.value)}
          />
        </div>
        <input
          type="number"
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
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
        </div>
        <textarea
          placeholder="Medical notes (allergies, conditions, etc.)"
          className="input-field"
          rows={3}
          value={form.medicalNotes}
          onChange={(e) => update("medicalNotes", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Emergency contact name"
            className="input-field"
            value={form.emergencyContactName}
            onChange={(e) => update("emergencyContactName", e.target.value)}
          />
          <input
            placeholder="Emergency contact phone"
            className="input-field"
            value={form.emergencyContactPhone}
            onChange={(e) => update("emergencyContactPhone", e.target.value)}
          />
        </div>
        <input
          placeholder="Microchip ID (optional)"
          className="input-field"
          value={form.microchipId}
          onChange={(e) => update("microchipId", e.target.value)}
        />

        {error && <p className="text-alert-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating..." : "Create pet profile"}
        </button>
      </form>
    </div>
  );
}
