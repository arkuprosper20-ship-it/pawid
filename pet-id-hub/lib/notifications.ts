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
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
    list.sort((a, b) => {
      const tA = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
      const tB = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
      return tB - tA;
    });
    return list.slice(0, limitCount);
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
