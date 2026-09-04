"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logActivity, addPetIdToProfile } from "@/lib/activityLog";

const BREED_OPTIONS: Record<string, string[]> = {
  Dog: ["Labrador", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Rottweiler", "Beagle", "Dachshund", "Siberian Husky", "Great Dane", "Doberman", "Boxer", "Chihuahua", "Shih Tzu", "Pomeranian", "Corgi", "Border Collie", "Australian Shepherd", "Jack Russell", "Pit Bull", "Mixed"],
  Cat: ["Persian", "Maine Coon", "Siamese", "Bengal", "Sphynx", "Ragdoll", "British Shorthair", "Abyssinian", "Devon Rex", "Scottish Fold", "American Shorthair", "Mixed"],
  Bird: ["Parakeet", "Cockatiel", "African Grey", "Macaw", "Lovebird", "Canary", "Finch", "Amazon Parrot", "Other"],
  Rabbit: ["Holland Lop", "Netherland Dwarf", "Rex", "Lionhead", "Angora", "Flemish Giant", "Mixed"],
  Other: ["Unknown", "Mixed"],
};

function resizeImage(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      reader.readAsDataURL(file);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function NewPetPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setPhotoPreview(dataUrl);
    } catch {
      setError("Could not process image. Please try another file.");
    }
  }

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setCameraStream(stream);
      setCameraOpen(true);
    } catch (err: any) {
      setCameraError(err.message || "Camera not available.");
    }
  }

  useEffect(() => {
    if (cameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraOpen, cameraStream]);

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setPhotoPreview(dataUrl);
    stopCamera();
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

    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }
      if (!user) {
        setError("You must be signed in to add a pet.");
        setLoading(false);
        return;
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
        photoUrl: photoPreview,
        status: "normal",
        lostSince: null,
        rewardNote: null,
        lastSeenLocation: null,
        badges: [],
        previousOwnerIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const petId = docRef.id;
      const userId = user.uid;

      await Promise.all([
        logActivity({
          userId,
          action: "pet_created",
          petId,
          metadata: { petName: form.name, species },
        }),
        addPetIdToProfile(userId, petId),
      ]);

      try {
        const raw = window.localStorage.getItem("pawid_local_pet_ids");
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(petId)) {
          list.push(petId);
          window.localStorage.setItem("pawid_local_pet_ids", JSON.stringify(list));
        }
      } catch {}

      router.push(`/dashboard/pets/${petId}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong creating the pet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

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
            list="breed-options"
            aria-label="Breed"
            placeholder="Breed"
            className="input-field"
            value={form.breed}
            onChange={(e) => update("breed", e.target.value)}
          />
          <datalist id="breed-options">
            {(BREED_OPTIONS[form.species] || []).map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
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
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Pet photo"
              onChange={handlePhotoChange}
              className="text-sm flex-1"
            />
            <button
              type="button"
              onClick={openCamera}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              📷 Camera
            </button>
          </div>
          {photoPreview && (
            <div className="mt-2">
              <img
                src={photoPreview}
                alt="Selected pet photo preview"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}
          {cameraOpen && (
            <div className="mt-3 space-y-2">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border border-gray-200" />
              <div className="flex gap-2">
                <button type="button" onClick={takePhoto} className="btn-primary text-sm">Capture</button>
                <button type="button" onClick={stopCamera} className="text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}
          {cameraError && <p className="text-xs text-alert-500 mt-1">{cameraError}</p>}
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
