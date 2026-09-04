import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { ActivityLog } from "@/types";

export async function logActivity({
  userId,
  action,
  petId,
  metadata,
}: {
  userId: string;
  action: string;
  petId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await addDoc(collection(db, "activityLog"), {
      userId,
      action,
      petId: petId || null,
      metadata: metadata || null,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}

export async function getUserActivityLogs(userId: string, limitCount = 50) {
  try {
    const q = query(
      collection(db, "activityLog"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
  } catch (err) {
    console.warn("Failed to fetch activity logs:", err);
    return [];
  }
}

export async function addPetIdToProfile(userId: string, petId: string) {
  try {
    const profileRef = doc(db, "profiles", userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      await updateDoc(profileRef, {
        petIds: arrayUnion(petId),
      });
    } else {
      await setDoc(profileRef, {
        petIds: [petId],
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Failed to add petId to profile:", err);
  }
}
