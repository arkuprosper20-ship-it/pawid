"use client";

import { useEffect, useState } from "react";
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
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { Pet, CommunityPost } from "@/types";

export default function AdminPage() {
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

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const profileSnap = await getDoc(doc(db, "profiles", user.uid));
    if (!profileSnap.exists() || !profileSnap.data().isAdmin) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    loadData();
  }

  async function loadData() {
    const petsSnap = await getDocs(
      query(collection(db, "pets"), orderBy("createdAt", "desc"))
    );
    setPets(petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet));

    const postsSnap = await getDocs(
      query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(50))
    );
    setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommunityPost));

    const [totalPetsCount, lostPetsCount, totalScansCount, totalUsersCount] =
      await Promise.all([
        getCountFromServer(collection(db, "pets")),
        getCountFromServer(query(collection(db, "pets"), where("status", "==", "lost"))),
        getCountFromServer(collection(db, "qrScans")),
        getCountFromServer(collection(db, "profiles")),
      ]);

    setStats({
      totalPets: totalPetsCount.data().count,
      lostPets: lostPetsCount.data().count,
      totalScans: totalScansCount.data().count,
      totalUsers: totalUsersCount.data().count,
    });
  }

  async function removePost(postId: string) {
    await updateDoc(doc(db, "communityPosts", postId), { isRemoved: true });
    loadData();
  }

  async function triggerBroadcast(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, "broadcastAlerts"), {
      petId: null,
      message: broadcastMsg,
      triggeredBy: auth.currentUser?.uid || null,
      isManual: true,
      createdAt: serverTimestamp(),
    });
    setBroadcastMsg("");
    alert("Broadcast sent to community feed.");
  }

  if (authorized === null) return <p className="text-gray-400">Checking access...</p>;
  if (authorized === false)
    return (
      <div className="card max-w-md mx-auto text-center py-10">
        <p className="text-alert-500 font-medium">Admin access only.</p>
        <p className="text-sm text-gray-500 mt-1">
          Ask a project admin to set <code>isAdmin: true</code> on your profile document.
        </p>
      </div>
    );

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
            placeholder="Message to broadcast to all users..."
            className="input-field text-sm"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
          />
          <button className="btn-alert text-sm whitespace-nowrap">Send alert</button>
        </form>
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
            .filter((p) => p.isFlagged && !p.isRemoved)
            .map((p) => (
              <div key={p.id} className="flex justify-between items-start border-b border-gray-50 pb-2">
                <div>
                  <p className="text-sm">{p.content}</p>
                  <p className="text-xs text-gray-400">{p.authorName || "Unknown"}</p>
                </div>
                <button
                  onClick={() => removePost(p.id)}
                  className="text-xs text-alert-500 hover:underline whitespace-nowrap ml-3"
                >
                  Remove
                </button>
              </div>
            ))}
          {posts.filter((p) => p.isFlagged && !p.isRemoved).length === 0 && (
            <p className="text-sm text-gray-400">No flagged posts.</p>
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
