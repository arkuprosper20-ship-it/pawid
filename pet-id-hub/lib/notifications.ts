import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "./firebase";
import { Notification } from "@/types";

export async function createNotification({
  userId,
  type,
  message,
  petId,
}: {
  userId: string;
  type: Notification["type"];
  message: string;
  petId?: string;
}) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      message,
      petId: petId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
}

export async function getUserNotifications(userId: string, limitCount = 20) {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  } catch (err) {
    console.warn("Failed to fetch notifications:", err);
    return [];
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (err) {
    console.warn("Failed to mark notification read:", err);
  }
}
