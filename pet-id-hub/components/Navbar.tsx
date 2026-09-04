"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logActivity } from "@/lib/activityLog";

export default function Navbar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
