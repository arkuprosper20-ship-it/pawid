"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, deleteUser as firebaseDeleteUser } from "firebase/auth";
import { doc, getDoc, deleteDoc, getDocs, query, where, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logActivity } from "@/lib/activityLog";

export default function Navbar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const prevUserRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || null;
      const wasSignedIn = prevUserRef.current !== null;
      const isSignedInNow = uid !== null;

      setIsSignedIn(isSignedInNow);
      setIsAdmin(false);
      prevUserRef.current = uid;

      if (!user) return;

      try {
        const profile = await getDoc(doc(db, "profiles", user.uid));
        setIsAdmin(profile.exists() && profile.data().isAdmin === true);
      } catch {
        setIsAdmin(false);
      }

      if (isSignedInNow && !wasSignedIn) {
        await logActivity({
          userId: user.uid,
          action: "sign_in",
          metadata: { email: user.email || null, provider: user.providerData[0]?.providerId || "anonymous" },
        });
      } else if (!isSignedInNow && wasSignedIn) {
        await logActivity({
          userId: prevUserRef.current || "unknown",
          action: "sign_out",
        });
      }
    });
    return () => unsubscribe();
  }, []);

  async function signOut() {
    await firebaseSignOut(auth);
    window.location.href = "/";
  }

  async function deleteAccount() {
    const user = auth.currentUser;
    if (!user) return;
    const ok = window.confirm(
      "Delete your account permanently? This will remove your profile, pets, posts, and activity history. This cannot be undone."
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const uid = user.uid;

      // Delete user-owned Firestore data
      const collections = [
        { name: "pets", query: query(collection(db, "pets"), where("ownerId", "==", uid)) },
        { name: "communityPosts", query: query(collection(db, "communityPosts"), where("authorId", "==", uid)) },
        { name: "activityLog", query: query(collection(db, "activityLog"), where("userId", "==", uid)) },
        { name: "notifications", query: query(collection(db, "notifications"), where("userId", "==", uid)) },
      ];

      for (const col of collections) {
        try {
          const snap = await getDocs(col.query);
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
        } catch (e) {
          console.warn(`Failed to delete ${col.name}:`, e);
        }
      }

      // Delete profile last
      try {
        await deleteDoc(doc(db, "profiles", uid));
      } catch (e) {
        console.warn("Failed to delete profile:", e);
      }

      // Delete Firebase Auth user
      await firebaseDeleteUser(user);
      window.location.href = "/";
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      alert(err.message || "Account deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-brand-700">
          🐾 PawID
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link href="/community" className="hover:text-brand-600">
            Community
          </Link>
          {isSignedIn ? (
            <>
              <Link href="/dashboard" className="hover:text-brand-600">
                My Pets
              </Link>
              {isAdmin && (
                <Link href="/admin" className="hover:text-brand-600">
                  Admin
                </Link>
              )}
              <button type="button" onClick={signOut} className="text-gray-400 hover:text-gray-700">
                Sign out
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="text-xs text-alert-500 hover:underline"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
