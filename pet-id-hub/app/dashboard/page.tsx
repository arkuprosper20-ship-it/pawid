"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { Pet, Notification } from "@/types";
import { logActivity, addPetIdToProfile } from "@/lib/activityLog";
import { getUserNotifications, markNotificationRead } from "@/lib/notifications";
import PetCard from "@/components/PetCard";

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      loadPets(user.uid, user.email);
      loadNotifications(user.uid);
    });
    return () => unsubscribe();
  }, []);

  async function loadNotifications(uid: string) {
    const notifs = await getUserNotifications(uid, 10);
    setNotifications(notifs);
  }

  async function transferOwnership(uid: string, email: string | null | undefined, petId: string, currentOwnerId: string) {
    try {
      await updateDoc(doc(db, "pets", petId), {
        ownerId: uid,
        ownerEmail: email || null,
        previousOwnerIds: arrayUnion(currentOwnerId),
      });
      await addPetIdToProfile(uid, petId);
      await logActivity({
        userId: uid,
        action: "pet_claimed",
        petId,
        metadata: { previousOwnerId: currentOwnerId },
      });
    } catch (e) {
      console.warn("Failed to transfer pet ownership:", e);
    }
  }

  async function loadPets(uid: string, email?: string | null) {
    try {
      const petsMap = new Map<string, Pet>();

      const [ownerSnap, emailSnap] = await Promise.all([
        getDocs(query(collection(db, "pets"), where("ownerId", "==", uid))),
        email
          ? getDocs(query(collection(db, "pets"), where("ownerEmail", "==", email)))
          : Promise.resolve({ docs: [] }),
      ]);

      ownerSnap.docs.forEach((d) => petsMap.set(d.id, { id: d.id, ...d.data() } as Pet));
      emailSnap.docs.forEach((d) => {
        if (!petsMap.has(d.id)) petsMap.set(d.id, { id: d.id, ...d.data() } as Pet);
      });

      let profilePetIds: string[] = [];
      try {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          profilePetIds = Array.isArray((profileData as any)?.petIds) ? (profileData as any).petIds : [];
        }
      } catch (e) {
        console.warn("Could not load profile pet IDs:", e);
      }

      try {
        const raw = window.localStorage.getItem("pawid_local_pet_ids");
        const localIds: string[] = raw ? JSON.parse(raw) : [];
        const allIdsToCheck = Array.from(new Set([...localIds, ...profilePetIds]));

        const petDocPromises = allIdsToCheck
          .filter((pid) => !petsMap.has(pid))
          .map((pid) => getDoc(doc(db, "pets", pid)).then((petDoc) => ({ pid, petDoc })).catch(() => null));
        const petDocResults = await Promise.all(petDocPromises);

        for (const result of petDocResults) {
          if (!result || !result.petDoc.exists()) continue;
          const { pid, petDoc } = result;
          const data = petDoc.data();
          petsMap.set(pid, { id: pid, ...data } as Pet);
          if (data.ownerId !== uid) {
            await transferOwnership(uid, email, pid, data.ownerId);
          }
        }
      } catch (e) {
        console.warn("Could not inspect local/profile pet IDs:", e);
      }

      const petsList = Array.from(petsMap.values());
      petsList.sort((a, b) => {
        const timeA = toJsDate(a.createdAt)?.getTime() || 0;
        const timeB = toJsDate(b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      });
      setPets(petsList);
    } catch (err) {
      console.error("Failed to load pets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(notif: Notification) {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    }
    setShowNotifications(false);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <p className="text-gray-400">Loading your pets...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Pets</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-sm text-brand-600 hover:text-brand-700 relative"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-alert-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-semibold">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${n.read ? "opacity-60" : ""}`}
                    >
                      <p className="text-sm text-gray-800">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{toJsDate(n.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Link href="/dashboard/history" className="text-sm text-brand-600 hover:text-brand-700">
            History
          </Link>
          <Link href="/dashboard/pets/new" className="btn-primary">
            + Add pet
          </Link>
        </div>
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
