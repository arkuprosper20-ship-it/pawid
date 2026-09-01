"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc as fsDoc, getDoc, setDoc as fsSetDoc, serverTimestamp } from "firebase/firestore";

export default function CompleteSignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    finishSignIn();
  }, []);

  async function finishSignIn(overrideEmail?: string) {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError("This sign-in link is invalid or has expired.");
      return;
    }

    let email = overrideEmail || window.localStorage.getItem("pawid_email_for_signin");
    if (!email) {
      // Link was opened on a different device — ask for the email to confirm identity
      setNeedsEmail(true);
      return;
    }

    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("pawid_email_for_signin");

      // Ensure a profile document exists for this user (Supabase used a
      // DB trigger for this; Firestore has no triggers on the client SDK,
      // so we create it here on first sign-in instead).
      const profileRef = fsDoc(db, "profiles", result.user.uid);
      const existing = await getDoc(profileRef);
      if (!existing.exists()) {
        await fsSetDoc(profileRef, {
          fullName: null,
          city: null,
          phone: null,
          isAdmin: false,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Could not complete sign-in.");
    }
  }

  if (needsEmail) {
    return (
      <div className="max-w-sm mx-auto mt-12">
        <div className="card">
          <h1 className="text-lg font-bold mb-2">Confirm your email</h1>
          <p className="text-sm text-gray-500 mb-4">
            For your security, please re-enter the email you signed in with.
          </p>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="input-field mb-3"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={() => finishSignIn(emailInput)}>
            Continue
          </button>
          {error && <p className="text-alert-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12 text-center text-gray-400">
      {error ? <p className="text-alert-500">{error}</p> : <p>Signing you in...</p>}
    </div>
  );
}
