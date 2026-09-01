"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
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
        <div className="flex items-center gap-4 text-sm">
          <Link href="/community" className="hover:text-brand-600">
            Community
          </Link>
          {email ? (
            <>
              <Link href="/dashboard" className="hover:text-brand-600">
                My Pets
              </Link>
              <button onClick={signOut} className="text-gray-400 hover:text-gray-700">
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
