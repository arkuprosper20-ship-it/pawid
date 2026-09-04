"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { Pet, CommunityPost } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [stats, setStats] = useState({
    totalPets: 0,
    lostPets: 0,
    totalScans: 0,
    totalUsers: 0,
  });
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      checkAdminAndLoad(user.uid);
    });
    return () => unsubscribe();
  }, [router]);

  async function checkAdminAndLoad(uid: string) {
    const profileSnap = await getDoc(doc(db, "profiles", uid));
    if (!profileSnap.exists() || profileSnap.data().isAdmin !== true) {
      router.replace("/dashboard");
      return;
    }
    setAuthorized(true);
    loadData();
  }
  async function loadData() {
    try {
      const [petsSnap, postsSnap] = await Promise.all([
        getDocs(query(collection(db, "pets"), orderBy("createdAt", "desc"), limit(100))),
        getDocs(query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(50))),
      ]);
      setPets(petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet));
      setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommunityPost));

      let totalPets = 0;
      let lostPets = 0;
      let totalScans = 0;
      let totalUsers = 0;

      try {
        const [totalPetsCount, lostPetsCount, totalScansCount, totalUsersCount] =
          await Promise.all([
            getCountFromServer(collection(db, "pets")),
            getCountFromServer(query(collection(db, "pets"), where("status", "==", "lost"))),
            getCountFromServer(collection(db, "qrScans")),
            getCountFromServer(collection(db, "profiles")),
          ]);
        totalPets = totalPetsCount.data().count;
        lostPets = lostPetsCount.data().count;
        totalScans = totalScansCount.data().count;
        totalUsers = totalUsersCount.data().count;
      } catch (countErr) {
        console.warn("Count queries failed, falling back to manual counts:", countErr);
        totalPets = petsSnap.size;
        lostPets = petsSnap.docs.filter((d) => d.data().status === "lost").length;
        totalScans = 0;
        totalUsers = 0;
        try {
          const usersSnap = await getDocs(collection(db, "profiles"));
          totalUsers = usersSnap.size;
        } catch {}
        try {
          const scansSnap = await getDocs(collection(db, "qrScans"));
          totalScans = scansSnap.size;
        } catch {}
      }

      setStats({
        totalPets,
        lostPets,
        totalScans,
        totalUsers,
      });
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  }

  async function removePost(postId: string) {
    try {
      await deleteDoc(doc(db, "communityPosts", postId));
    } catch {
      await updateDoc(doc(db, "communityPosts", postId), { isRemoved: true });
    }
    loadData();
  }

  function displayAuthor(post: CommunityPost): string {
    if (post.authorIsAdmin) return "Management";
    if (post.authorUsername && post.authorUsername.trim()) return post.authorUsername;
    if (post.authorName && post.authorName.trim()) return post.authorName;
    return "Unknown member";
  }

  async function triggerBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setSendingBroadcast(true);
    setBroadcastStatus(null);
    try {
      await addDoc(collection(db, "broadcastAlerts"), {
        petId: null,
        message: broadcastMsg,
        triggeredBy: auth.currentUser?.uid || null,
        isManual: true,
        createdAt: serverTimestamp(),
      });
      setBroadcastMsg("");
      setBroadcastStatus("Broadcast sent to community feed.");
    } catch (err: any) {
      setBroadcastStatus(err.message || "Could not send broadcast. Try again.");
    }
    setSendingBroadcast(false);
  }

  if (authorized === null) return <p className="text-gray-400">Checking access...</p>;
  if (authorized === false) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total pets" value={stats.totalPets} />
        <StatCard label="Currently lost" value={stats.lostPets} highlight={stats.lostPets > 0} />
        <StatCard label="Total scans" value={stats.totalScans} />
        <StatCard label="Total users" value={stats.totalUsers} />
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold mb-2">Emergency broadcast</h2>
        <form onSubmit={triggerBroadcast} className="flex gap-2">
          <input
            required
            aria-label="Message to broadcast to all users"
            placeholder="Message to broadcast to all users..."
            className="input-field text-sm"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
          />
          <button
            type="submit"
            disabled={sendingBroadcast}
            className="btn-alert text-sm whitespace-nowrap"
          >
            {sendingBroadcast ? "Sending..." : "Send alert"}
          </button>
        </form>
        {broadcastStatus && (
          <p
            role="status"
            className={`text-sm mt-2 ${
              broadcastStatus.startsWith("Could") ? "text-alert-500" : "text-brand-700"
            }`}
          >
            {broadcastStatus}
          </p>
        )}
      </div>

      <div className="card mb-8 overflow-x-auto">
        <h2 className="font-semibold mb-3">Pets</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Name</th>
              <th className="pb-2">Species</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {pets.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.species}</td>
                <td className="py-2">
                  <span
                    className={`badge-pill ${
                      p.status === "lost"
                        ? "bg-alert-500 text-white"
                        : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="py-2 text-gray-400">
                  {toJsDate(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Content moderation</h2>
        <div className="space-y-2">
          {posts
            .filter((p) => !p.isRemoved)
            .map((p) => (
              <div key={p.id} className="flex justify-between items-start border-b border-gray-50 pb-2">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-xs text-gray-400">
                    {displayAuthor(p)}
                    {p.isFlagged && (
                      <span className="ml-2 text-yellow-600">⚑ Flagged</span>
                    )}
                  </p>
                  <p className="text-sm break-words">{p.content}</p>
                </div>
                <button
                  onClick={() => removePost(p.id)}
                  className="text-xs text-alert-500 hover:underline whitespace-nowrap ml-3"
                >
                  Remove
                </button>
              </div>
            ))}
          {posts.filter((p) => !p.isRemoved).length === 0 && (
            <p className="text-sm text-gray-400">No posts to moderate.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card text-center ${highlight ? "border-alert-500" : ""}`}>
      <p className={`text-2xl font-bold ${highlight ? "text-alert-500" : ""}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
