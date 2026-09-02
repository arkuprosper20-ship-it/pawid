"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Pet } from "@/types";
import PetCard from "@/components/PetCard";

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      loadPets(user.uid);
    });
    return () => unsubscribe();
  }, []);

  async function loadPets(uid: string) {
    const q = query(
      collection(db, "pets"),
      where("ownerId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet));
    setLoading(false);
  }

  if (loading) return <p className="text-gray-400">Loading your pets...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Pets</h1>
        <Link href="/dashboard/pets/new" className="btn-primary">
          + Add pet
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4" aria-hidden="true">🐾</div>
          <h2 className="text-xl font-semibold mb-2">No pets yet</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Add your first pet to generate their QR ID tag and keep their
            important details one scan away.
          </p>
          <Link href="/dashboard/pets/new" className="btn-primary inline-flex">
            + Add your first pet
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} badges={pet.badges || []} />
          ))}
        </div>
      )}
    </div>
  );
}
